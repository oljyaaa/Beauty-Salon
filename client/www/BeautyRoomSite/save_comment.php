<?php
$conn = new mysqli(
    "dg602726.mysql.tools",
    "dg602726_salon",
    "C4cxy5D^+8",
    "dg602726_salon"
);

if ($conn->connect_error) {
    die("Помилка підключення: " . $conn->connect_error);
}

$name = $conn->real_escape_string($_POST['name']);
$email = $conn->real_escape_string($_POST['email']);
$service = $conn->real_escape_string($_POST['service']);
$description = $conn->real_escape_string($_POST['description']);

$sql = "INSERT INTO comments (name, email, service, description, status)
        VALUES ('$name', '$email', '$service', '$description', 'approved')";

if ($conn->query($sql) === TRUE) {
    header("Location: blog-single.php?success=1");
    exit();
} else {
    echo "Помилка: " . $conn->error;
}

$conn->close();
?>
