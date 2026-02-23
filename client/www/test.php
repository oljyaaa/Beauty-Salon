<?php
define("HOST", "localhost");
define("USER", "root");
define("PASSWORD", "");
define("DB", "salon");

$conn = new mysqli(HOST, USER, PASSWORD, DB);

if ($conn->connect_error) {
    die("Помилка підключення: " . $conn->connect_error);
}
$conn->set_charset("utf8");

echo "Підключення успішне";
?>
