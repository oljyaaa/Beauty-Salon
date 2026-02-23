<?php
$host = 'dg602726.mysql.tools'; 
$dbname = 'dg602726_salon'; // Назва вашої бази даних
$username = 'dg602726_salon'; // Ваш логін до БД
$password = 'C4cxy5D^+8'; // Ваш пароль до БД
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $username, $password, $options);
} catch (\PDOException $e) {
     throw new \PDOException($e->getMessage(), (int)$e->getCode());
}
?>