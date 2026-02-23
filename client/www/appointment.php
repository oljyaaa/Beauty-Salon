<?php
// Виводимо тільки текст (щоб fetch().text() міг нормально це показати)
header('Content-Type: text/plain; charset=utf-8');

ini_set('display_errors', 0);
error_reporting(E_ALL);

// ---- 1. Перевірка методу ----
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo "❌ Невірний метод запиту.";
    exit;
}

// ---- 2. Читаємо дані форми ----
$name       = trim($_POST['name'] ?? '');
$email      = trim($_POST['email'] ?? '');
$phone      = trim($_POST['phone'] ?? '');
$service    = trim($_POST['service'] ?? '');
$message    = trim($_POST['message'] ?? '');
$cart_raw   = $_POST['cart_raw'] ?? '';
$captchaRes = $_POST['cf-turnstile-response'] ?? '';

// ---- 3. Базова валідація ----
if ($name === '' || $email === '' || $phone === '' || $service === '' || $message === '') {
    echo "❌ Будь ласка, заповніть усі поля форми.";
    exit;
}

// телефон: тільки цифри + пробіли/+/()/-
if (!preg_match('/^\+?\d[\d\s\-()]{6,}$/', $phone)) {
    echo "❌ Введіть коректний номер телефону.";
    exit;
}

// Примітивна валідація email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "❌ Введіть коректний email.";
    exit;
}

// ---- 4. Перевірка Cloudflare Turnstile ----
if ($captchaRes === '') {
    echo "❌ Підтвердіть, що ви не бот, пройшовши капчу.";
    exit;
}

$secret = "0x4AAAAAACDoXrBymEAB75RV_i_a1S0kBT8"; // ТВОЄ secret key
$remoteip = $_SERVER['REMOTE_ADDR'] ?? '';

$verifyData = http_build_query([
    'secret'   => $secret,
    'response' => $captchaRes,
    'remoteip' => $remoteip,
]);

$ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
curl_setopt_array($ch, [
    CURLOPT_POST            => true,
    CURLOPT_POSTFIELDS      => $verifyData,
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_HEADER          => false,
    CURLOPT_SSL_VERIFYPEER  => true,
]);
$rawResponse = curl_exec($ch);
$curlErr     = curl_error($ch);
curl_close($ch);

if ($rawResponse === false) {
    echo "❌ Помилка перевірки капчі: " . $curlErr;
    exit;
}

$captchaResult = json_decode($rawResponse, true);
if (empty($captchaResult['success'])) {
    echo "❌ Капча не пройдена. Спробуйте ще раз.";
    exit;
}

// ---- 5. Підключення до БД (хостинг, а НЕ localhost) ----
$host = 'dg602726.mysql.tools';
$db   = 'dg602726_salon';
$user = 'dg602726_salon';
$pass = 'C4cxy5D^+8';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    echo "❌ Помилка підключення до бази даних.";
    exit;
}

// ---- 6. Формуємо текст, який підемо в БД ----
// Якщо хочеш, щоб у БД був і текст з кошика:
$fullMessage = $message;
if ($cart_raw !== '') {
    $fullMessage .= "\n\n---\nАвтоматично з кошика:\n" . $cart_raw;
}

// ---- 7. Запис у таблицю appointments ----
// Очікувана структура: id, name, email, phone, service, message, created_at
try {
    $stmt = $pdo->prepare("
        INSERT INTO appointments (name, email, phone, service, message, created_at)
        VALUES (:name, :email, :phone, :service, :message, NOW())
    ");
    $stmt->execute([
        ':name'    => $name,
        ':email'   => $email,
        ':phone'   => $phone,
        ':service' => $service,
        ':message' => $fullMessage,
    ]);
} catch (PDOException $e) {
    echo "❌ Помилка збереження в базу.";
    exit;
}

// ---- 8. Відповідь для фронтенду ----
echo "✅ Заявка відправлена! Ми зв'яжемося з вами найближчим часом.";
exit;
