<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define("HOST", "dg602726.mysql.tools");
define("USER", "dg602726_salon");
define("PASSWORD", "C4cxy5D^+8");
define("DB", "dg602726_salon");

error_reporting(0);
ini_set('display_errors', 0);

$conn = new mysqli(HOST, USER, PASSWORD, DB);
if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Connection failed"]);
    exit();
}

// ПРИМУСОВЕ ВИПРАВЛЕННЯ КОДУВАННЯ (вирішує проблему sjis_bin)
$conn->set_charset("utf8mb4");
$conn->query("SET NAMES utf8mb4");
$conn->query("SET CHARACTER SET utf8mb4");
$conn->query("SET collation_connection = 'utf8mb4_unicode_ci'");

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// --- 1. LOGIN ---
if ($action === 'login') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $stmt = $conn->prepare("SELECT * FROM users WHERE email=? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if ($user && (password_verify($password, $user['password']) || $user['password'] === md5($password))) {
        if ($user['password'] === md5($password)) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $conn->query("UPDATE users SET password='$newHash' WHERE id={$user['id']}");
        }
        $conn->query("UPDATE users SET last_activity = NOW() WHERE id=".(int)$user['id']);
        echo json_encode(["status" => "success", "user" => ["id" => $user['id'], "username" => $user['username'], "role" => $user['role'], "permissions" => $user['permissions']]]);
    } else {
        echo json_encode(["status" => "error", "message" => "Невірні дані"]);
    }
    exit();
}

// --- 2. GET DATA ---
if ($action === 'get_all_data') {
    $data = ["records"=>[], "archive"=>[], "calls"=>[]];
    $r1 = $conn->query("SELECT * FROM records ORDER BY record_date ASC, record_time ASC");
    if($r1) while($row = $r1->fetch_assoc()) $data['records'][] = $row;
    
    $r2 = $conn->query("SELECT * FROM archive ORDER BY datetime DESC LIMIT 300");
    if($r2) while($row = $r2->fetch_assoc()) $data['archive'][] = $row;
    
    $r3 = $conn->query("SELECT * FROM appointments ORDER BY created_at DESC");
    if($r3) while($row = $r3->fetch_assoc()) $data['calls'][] = $row;
    
    echo json_encode(["status"=>"success","data"=>$data]);
    exit();
}

// --- 3. PRICING ---
if ($action === 'get_pricing') {
    $cats = $conn->query("SELECT * FROM servicecategories ORDER BY title");
    $data = [];
    if($cats) {
        while($c = $cats->fetch_assoc()) {
            $cid = $c['category_id'];
            $servs = $conn->query("SELECT * FROM services WHERE category_id = $cid ORDER BY name");
            $c['services'] = [];
            if($servs) while($s = $servs->fetch_assoc()) $c['services'][] = $s;
            $data[] = $c;
        }
    }
    echo json_encode(["status" => "success", "data" => $data]);
    exit();
}

if ($action === 'add_service') {
    $stmt = $conn->prepare("INSERT INTO services (category_id, name, price_string, price_numeric) VALUES (?,?,?,?)");
    $stmt->bind_param("issd", $_POST['category_id'], $_POST['name'], $_POST['price_string'], $_POST['price_numeric']);
    $stmt->execute(); echo json_encode(["status" => "success"]); exit();
}
if ($action === 'update_service') {
    $stmt = $conn->prepare("UPDATE services SET name=?, price_string=?, price_numeric=? WHERE service_id=?");
    $stmt->bind_param("ssdi", $_POST['name'], $_POST['price_string'], $_POST['price_numeric'], $_POST['service_id']);
    $stmt->execute(); echo json_encode(["status" => "success"]); exit();
}
if ($action === 'delete_service') {
    $conn->query("DELETE FROM services WHERE service_id=".(int)$_POST['delete_service']);
    echo json_encode(["status" => "success"]); exit();
}

// --- 4. CRUD RECORDS ---
if ($action === 'add_record') {
    $c=$_POST['client_name']; $p=$_POST['phone']; $cat=$_POST['category']; $s=$_POST['service_name']; 
    $d=$_POST['record_date']; $t=$_POST['record_time']; $n=$_POST['note']??''; $w=$_POST['worker_name']??'Не вказано';

    $check = $conn->prepare("SELECT id FROM records WHERE record_date=? AND record_time=? AND worker_name=?");
    $check->bind_param("sss",$d,$t,$w);
    $check->execute();
    if ($check->get_result()->num_rows > 0) { echo json_encode(["status"=>"error","message"=>"Цей час вже зайнято"]); exit(); }

    $stmt = $conn->prepare("INSERT INTO records (client_name, phone, category, service_name, record_date, record_time, note, worker_name) VALUES (?,?,?,?,?,?,?,?)");
    $stmt->bind_param("ssssssss",$c,$p,$cat,$s,$d,$t,$n,$w);
    if($stmt->execute()) echo json_encode(["status"=>"success"]);
    else echo json_encode(["status"=>"error","message"=>$stmt->error]);
    exit();
}

if ($action === 'update_record') {
    $id = (int)$_POST['update_id']; 
    $c = $_POST['client_name']; 
    $p = $_POST['phone']; 
    $cat = $_POST['category'] ?? ''; 
    $s = $_POST['service_name']; 
    $d = $_POST['record_date']; 
    $t = $_POST['record_time']; 
    $n = $_POST['note'] ?? ''; 
    $w = $_POST['worker_name'] ?? 'Не вказано';

    $stmt = $conn->prepare("UPDATE records SET client_name=?, phone=?, category=?, service_name=?, record_date=?, record_time=?, note=?, worker_name=? WHERE id=?");
    $stmt->bind_param("ssssssssi", $c, $p, $cat, $s, $d, $t, $n, $w, $id);
    
    if($stmt->execute()) echo json_encode(["status"=>"success"]);
    else echo json_encode(["status"=>"error","message"=>$stmt->error]);
    exit();
}

// --- 5. ARCHIVE & RESTORE ---
if ($action === 'move_to_archive') {
    try {
        $id = (int)$_POST['id'];
        $res = $conn->query("SELECT * FROM records WHERE id=$id");
        if($row = $res->fetch_assoc()) {
            $name = mb_substr($row['client_name'], 0, 100, 'UTF-8');
            $phone = mb_substr($row['phone'], 0, 20, 'UTF-8');
            $full = mb_substr($row['category']." → ".$row['service_name'], 0, 255, 'UTF-8');
            
            $time = strlen(trim($row['record_time'])) >= 5 ? substr(trim($row['record_time']), 0, 5).":00" : "00:00:00";
            $dt = $row['record_date'].' '.$time;
            
            // Пряма вставка з вказанням кодування
            $stmt = $conn->prepare("INSERT INTO archive (name, phone, service, datetime) VALUES (?,?,?,?)");
            $stmt->bind_param("ssss", $name, $phone, $full, $dt);
            
            if($stmt->execute()) {
                $conn->query("DELETE FROM records WHERE id=$id");
                echo json_encode(["status"=>"success"]);
            } else {
                throw new Exception("Помилка додавання в архів: " . $stmt->error);
            }
        } else {
            throw new Exception("Запис не знайдено");
        }
    } catch (Throwable $e) {
        echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
    }
    exit();
}

if ($action === 'restore') {
    try {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) throw new Exception("ID запису не передано.");

        $res = $conn->query("SELECT * FROM archive WHERE id=$id");
        if (!$res) throw new Exception("Помилка читання БД: " . $conn->error);

        $r = $res->fetch_assoc();
        if (!$r) throw new Exception("Цей запис вже не існує в архіві.");

        $service_str = (string)($r['service'] ?? '');
        $datetime_str = (string)($r['datetime'] ?? date('Y-m-d 09:00:00'));
        $c = (string)($r['name'] ?? 'Без імені');
        $p = (string)($r['phone'] ?? '');

        // Використовуємо мультибайтний explode для безпеки
        $parts = explode(' → ', $service_str);
        $cat = !empty($parts[0]) ? trim($parts[0]) : 'Інше';
        $srv = isset($parts[1]) ? trim($parts[1]) : $service_str;

        $dtParts = explode(' ', $datetime_str);
        $d = !empty($dtParts[0]) ? $dtParts[0] : date('Y-m-d');
        $t = !empty($dtParts[1]) ? $dtParts[1] : '09:00:00';

        $n = '';
        $w = 'Відновлено з архіву';

        // Використовуємо SQL з COLLATION для захисту від sjis_bin
        $stmt = $conn->prepare("INSERT INTO records (client_name, phone, category, service_name, record_date, record_time, note, worker_name) VALUES (?,?,?,?,?,?,?,?)");
        if (!$stmt) throw new Exception("Помилка підготовки запиту: " . $conn->error);

        $stmt->bind_param("ssssssss", $c, $p, $cat, $srv, $d, $t, $n, $w);
        
        if (!$stmt->execute()) throw new Exception("Помилка збереження (MySQL): " . $stmt->error);

        if (!$conn->query("DELETE FROM archive WHERE id=$id")) {
            throw new Exception("Відновлено, але не видалено з архіву: " . $conn->error);
        }

        echo json_encode(["status" => "success"]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// --- 6. DELETE ---
if ($action === 'delete_record') { $conn->query("DELETE FROM records WHERE id=".(int)$_POST['id']); echo json_encode(["status"=>"success"]); exit(); }
if ($action === 'delete_archive') { $conn->query("DELETE FROM archive WHERE id=".(int)$_POST['id']); echo json_encode(["status"=>"success"]); exit(); }
if ($action === 'delete_appointment') { $conn->query("DELETE FROM appointments WHERE id=".(int)$_POST['id']); echo json_encode(["status"=>"success"]); exit(); }

echo json_encode(["status"=>"error","message"=>"Invalid action"]);
$conn->close();
?>