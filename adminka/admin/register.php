<?php
session_start();

// 🛑 БЕЗПЕКА: Тільки адміністратор може реєструвати нових користувачів
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    die("❌ У вас немає доступу до цієї сторінки. <a href='login.php'>Увійдіть</a> як адміністратор.");
}

// 🔹 Константи підключення
define("HOST", "dg602726.mysql.tools");
define("USER", "dg602726_salon");
define("PASSWORD", "C4cxy5D^+8");
define("DB", "dg602726_salon");

// 🔹 Підключення
$conn = new mysqli(HOST, USER, PASSWORD, DB);
if ($conn->connect_error) {
    die("Помилка підключення: " . $conn->connect_error);
}
$conn->set_charset("utf8");

// 🔹 Обробка форми
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = trim($_POST['username']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    
    // Нові поля
    $role = $_POST['role'];
    $permissions = isset($_POST['permissions']) ? implode(',', $_POST['permissions']) : ''; // 'Масаж,archive'

    // Перевірка чи співпадають паролі
    if ($password !== $confirm_password) {
        $error = "❌ Паролі не співпадають!";
    } else {
        // Перевірка унікальності
        $check = $conn->prepare("SELECT * FROM users WHERE email = ? OR username = ?");
        $check->bind_param("ss", $email, $username);
        $check->execute();
        $result = $check->get_result();

        if ($result->num_rows > 0) {
            $error = "❌ Користувач з такою поштою або логіном вже існує!";
        } else {
            // ✅ Сучасне хешування пароля
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            // Додаємо користувача (з роллю та правами)
            // ПРИМІТКА: Переконайтеся, що у вашій таблиці `users` є колонки `role` та `permissions`
            $sql = "INSERT INTO users (username, email, password, role, permissions, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssss", $username, $email, $hashedPassword, $role, $permissions);

            if ($stmt->execute()) {
                // Повертаємо адміна в адмін-панель
                echo "<script>
                        alert('✅ Новий користувач " . htmlspecialchars($username, ENT_QUOTES) . " успішно створений!');
                        window.location.href = 'admin.php';
                      </script>";
                exit();
            } else {
                $error = "❌ Помилка: " . $conn->error;
            }
            $stmt->close();
        }
        $check->close();
    }
}
$conn->close();
?>

<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Створити нового користувача</title>
  <!-- 🎨 Підключено новий файл стилів -->
  <link rel="stylesheet" href="style1.css">
</head>
<body>
    <div class="register-container">
        <div class="register-card">
          <h1>Створити акаунт</h1>
          <p>Створення нового профілю для адмін-панелі.</p>

          <!-- Вивід помилок -->
          <?php if (!empty($error)) echo "<p style='color:red; font-weight: bold;'>$error</p>"; ?>

          <!-- Форма реєстрації -->
          <form id="register-form" action="register.php" method="POST">
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" name="username" id="username" placeholder="Введіть логін" required>
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" name="email" id="email" placeholder="Введіть email" required>
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" name="password" id="password" placeholder="Введіть пароль" required>
            </div>

            <div class="form-group">
              <label for="confirm-password">Confirm Password</label>
              <input type="password" name="confirm_password" id="confirm-password" placeholder="Підтвердіть пароль" required>
            </div>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #CBD5C0;">

            <!-- НОВІ ПОЛЯ -->
            <div class="form-group">
              <label for="role">Роль користувача</label>
              <select name="role" id="role" required>
                <option value="user">User (Працівник)</option>
                <option value="admin">Admin (Адміністратор)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Права доступу (для ролі "User")</label>
              <p style="font-size: 0.8em; color: #777; margin-top: -10px;">Для 'Admin' права не потрібні (має повний доступ).</p>
              <div class="permissions-grid">
                 <label><input type="checkbox" name="permissions[]" value="all"> 👑 Повний доступ (all)</label>
                 <label><input type="checkbox" name="permissions[]" value="Масаж"> Масаж</label>
                 <label><input type="checkbox" name="permissions[]" value="Elos-епіляція"> Elos-епіляція</label>
                 <label><input type="checkbox" name="permissions[]" value="Доглядові процедури"> Доглядові процедури</label>
                 <label><input type="checkbox" name="permissions[]" value="archive"> Архів</label>
                 <label><input type="checkbox" name="permissions[]" value="call"> Перетелефонувати</label>
                 <label><input type="checkbox" name="permissions[]" value="comments"> Коментарі</label>
              </div>
            </div>
            <!-- КІНЕЦЬ НОВИХ ПОЛІВ -->

            <button type="submit" class="btn-register">Створити користувача</button>
          </form>
        </div>
      </div>
      
      <!-- Кнопка "Назад" (тепер стилізована через .btn-home) -->
      <a href="admin.php" class="btn-home">Повернутись в адмінку</a>
</body>
</html>
