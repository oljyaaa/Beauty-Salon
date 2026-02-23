<?php
session_start();


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
    $email = trim($_POST['email']);
    $password = $_POST['password'];

    // Шукаємо користувача
    $sql = "SELECT * FROM users WHERE email = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if ($user) {
        $dbPassword = $user['password'];
        $redirect_file = 'admin.php'; // Призначення за замовчуванням

        // 🌟 Встановлюємо файл для перенаправлення
        if ($user['role'] === 'creator') {
            $redirect_file = 'creatortool.php';
        }
        
        // ✅ Спочатку пробуємо password_verify (новий метод)
        if (password_verify($password, $dbPassword)) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['permissions'] = $user['permissions'];
            $_SESSION['role'] = $user['role'];
            
            // ➡️ Умовне перенаправлення
            header("Location: " . $redirect_file);
            exit();
        }
        
        // ⚠️ Якщо в БД ще старий md5
        elseif ($dbPassword === md5($password)) {
            // Перехешовуємо в новий формат
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $upd = $conn->prepare("UPDATE users SET password=? WHERE id=?");
            $upd->bind_param("si", $newHash, $user['id']);
            $upd->execute();

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['permissions'] = $user['permissions'];
            $_SESSION['role'] = $user['role'];
            
            // ➡️ Умовне перенаправлення
            header("Location: " . $redirect_file);
            exit();
        } else {
            $error = "❌ Невірний пароль!";
        }
    } else {
        $error = "❌ Користувач не знайдений!";
    }
    $stmt->close();
}
$conn->close();
?>

<!DOCTYPE html>
<html lang="uk">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="UTF-8">
  <title>Login</title>
  <link rel="stylesheet" href="style2_login.css">
</head>
<body>
  <div class="login-container">
    <div class="login-card">
      <h1>Log in</h1>
      <?php if (!empty($error)) echo "<p style='color:red;'>$error</p>"; ?>
      <form method="POST" action="login.php">
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password" required>
        </div>
        <button type="submit" class="btn-login">Login</button>
      </form>
      <!-- <p class="register-link">
        Don’t have an account? <a href="register.php">Register</a> -->
      </p>
    </div>
  </div>
</body>
</html>
