<?php
session_start();
// session_unset();
// session_destroy();
// header("Location: login.php");
// exit();

if (isset($_SESSION['id'])) {
    $id = $_SESSION['id'];
    $conn->query("UPDATE users SET last_activity = NOW() WHERE id = '$id'");
}

session_destroy();
header("Location: login.php");
exit;
?>
