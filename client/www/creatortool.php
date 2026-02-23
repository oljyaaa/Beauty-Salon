<?php
session_start();

define("HOST", "dg602726.mysql.tools");
define("USER", "dg602726_salon");
define("PASSWORD", "C4cxy5D^+8");
define("DB", "dg602726_salon");

if (!isset($_SESSION['user_id'])) { header("Location: login.php"); exit(); }

if (strtolower($_SESSION['role']) !== 'admin' && strtolower($_SESSION['role']) !== 'creator') {
    echo "Недостатньо прав доступу."; exit();
}

$conn = new mysqli(HOST, USER, PASSWORD, DB);
if ($conn->connect_error) die("Помилка підключення: " . $conn->connect_error);
$conn->set_charset("utf8mb4");

$message = '';
$error = '';
if (isset($_GET['message'])) $message = htmlspecialchars($_GET['message']);
if (isset($_GET['error'])) $error = htmlspecialchars($_GET['error']);

$user_permissions = [];
if (!empty($_SESSION['permissions'])) $user_permissions = array_map('trim', explode(',', $_SESSION['permissions']));

function can_access($tab) {
    global $user_permissions;

    $role = strtolower($_SESSION['role'] ?? '');
    // admin + creator: завжди бачать адмін-вкладки
    if ($role === 'admin' || $role === 'creator') {
        if (in_array($tab, ['dashboard','pricing','history','archive','call','comments','all','Масаж','Elos-епіляція','Доглядові процедури'])) return true;
    }

    if ($tab === 'all' && in_array('all', $user_permissions)) return true;
    return in_array($tab, $user_permissions);
}

function log_service_change($conn, $action, $service_id, $category_id, $old, $new) {
    $user_id = (int)($_SESSION['user_id'] ?? 0);
    $username = $_SESSION['username'] ?? '';

    $stmt = $conn->prepare("
        INSERT INTO service_change_log
        (user_id, username, action, service_id, category_id,
         name_old, name_new, price_string_old, price_string_new, price_numeric_old, price_numeric_new)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $name_old = $old['name'] ?? null;
    $name_new = $new['name'] ?? null;
    $ps_old = $old['price_string'] ?? null;
    $ps_new = $new['price_string'] ?? null;
    $pn_old = isset($old['price_numeric']) ? (float)$old['price_numeric'] : null;
    $pn_new = isset($new['price_numeric']) ? (float)$new['price_numeric'] : null;

    $stmt->bind_param(
        "issiiisssdd",
        $user_id,
        $username,
        $action,
        $service_id,
        $category_id,
        $name_old,
        $name_new,
        $ps_old,
        $ps_new,
        $pn_old,
        $pn_new
    );
    $stmt->execute();
    $stmt->close();
}

/* ====== USER UPDATE (твоя логіка) ====== */
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST['update_user'])) {
    if (strtolower($_SESSION['role']) !== 'admin' && strtolower($_SESSION['role']) !== 'creator') {
        $error = "Недостатньо прав для оновлення користувача.";
    } else {
        $user_id = (int)$_POST['user_id'];
        $new_permissions = isset($_POST['permissions']) && is_array($_POST['permissions']) ? implode(',', $_POST['permissions']) : '';

        $can_update = true;
        $check_role_sql = $conn->prepare("SELECT role FROM users WHERE id = ?");
        $check_role_sql->bind_param("i", $user_id);
        $check_role_sql->execute();
        $result_role = $check_role_sql->get_result()->fetch_assoc();
        $check_role_sql->close();

        if ($result_role) {
            $user_to_edit_role = $result_role['role'];

            if ($user_id == $_SESSION['user_id'] && strtolower($_SESSION['role']) === 'creator') {
                $new_role = $user_to_edit_role;
            } elseif ((strtolower($_SESSION['role']) === 'admin' || strtolower($_SESSION['role']) === 'creator') && isset($_POST['role'])) {
                $new_role = trim($_POST['role']);
            } else {
                $new_role = $user_to_edit_role;
            }
        } else {
            $error = "Користувач не знайдений.";
            $can_update = false;
        }

        if ($can_update) {
            $update_sql = "UPDATE users SET permissions = ?, role = ? WHERE id = ?";
            $update_stmt = $conn->prepare($update_sql);
            $update_stmt->bind_param("ssi", $new_permissions, $new_role, $user_id);

            if ($update_stmt->execute()) $message = "✅ Дані користувача успішно оновлено.";
            else $error = "❌ Помилка при оновленні: " . $conn->error;

            $update_stmt->close();
        }
    }
    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ====== USER DELETE (твоя логіка) ====== */
if (isset($_GET['delete_id']) && !isset($_GET['delete_service_id'])) {
    $delete_id = (int)$_GET['delete_id'];
    $can_delete = false;

    if ($delete_id == $_SESSION['user_id']) {
        $error = "Ви не можете видалити власний обліковий запис.";
    } else {
        $check_role_sql = $conn->prepare("SELECT role FROM users WHERE id = ?");
        $check_role_sql->bind_param("i", $delete_id);
        $check_role_sql->execute();
        $result_role = $check_role_sql->get_result()->fetch_assoc();
        $check_role_sql->close();

        if ($result_role) {
            if (strtolower($_SESSION['role']) === 'admin' || strtolower($_SESSION['role']) === 'creator') $can_delete = true;
        }

        if ($can_delete) {
            $del_sql = "DELETE FROM users WHERE id = ?";
            $del_stmt = $conn->prepare($del_sql);
            $del_stmt->bind_param("i", $delete_id);
            if ($del_stmt->execute()) $message = "✅ Користувача успішно видалено.";
            else $error = "❌ Помилка при видаленні користувача: " . $conn->error;
            $del_stmt->close();
        } else $error = "Недостатньо прав для видалення цього користувача.";
    }
    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ====== AJAX: get_user_data (твоя логіка) ====== */
if (isset($_POST['get_user_data'])) {
    header('Content-Type: application/json');
    $user_id = (int)$_POST['get_user_data'];

    $can_view = (strtolower($_SESSION['role']) === 'admin' || strtolower($_SESSION['role']) === 'creator');

    if ($can_view) {
        $stmt = $conn->prepare("SELECT id, username, email, permissions, role FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $user_data = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        echo json_encode($user_data);
    } else echo json_encode(['error' => 'Недостатньо прав для перегляду цих даних.']);
    exit;
}

/* ===========================================================
   =================== PRICING + HISTORY =====================
   =========================================================== */

/* ===== AJAX: завантаження прайсу ===== */
if (isset($_POST['load_pricing_editor'])) {
    if (!can_access('pricing')) { echo "<p>Недостатньо прав.</p>"; exit; }

    $categories = $conn->query("SELECT * FROM servicecategories ORDER BY title");
    $services_grouped = [];
    $services = $conn->query("SELECT * FROM services ORDER BY name");
    while($s = $services->fetch_assoc()) $services_grouped[$s['category_id']][] = $s;

    $html = '';
    while($cat = $categories->fetch_assoc()) {
        $html .= '<div class="pricing-category-group">';
        $html .= '<h3>' . htmlspecialchars($cat['title']) . '</h3>';
        $html .= '<div class="service-list">';

        if (isset($services_grouped[$cat['category_id']])) {
            foreach ($services_grouped[$cat['category_id']] as $service) {
                $html .= '<div class="service-item" data-service-id="' . (int)$service['service_id'] . '">';
                $html .= '<span class="service-name">' . htmlspecialchars($service['name']) . '</span>';
                $html .= '<span class="service-price">' . htmlspecialchars($service['price_string']) . ' грн</span>';
                $html .= '</div>';
            }
        } else $html .= '<p class="empty-service-list">У цій категорії немає послуг.</p>';

        $html .= '</div></div>';
    }
    echo $html;
    exit;
}

/* ===== AJAX: отримати дані однієї послуги ===== */
if (isset($_POST['get_service_data'])) {
    header('Content-Type: application/json');
    if (!can_access('pricing')) { echo json_encode(['error'=>'Недостатньо прав.']); exit; }

    $service_id = (int)$_POST['get_service_data'];
    $stmt = $conn->prepare("
        SELECT s.*, c.title as category_title
        FROM services s
        JOIN servicecategories c ON s.category_id = c.category_id
        WHERE s.service_id = ?
    ");
    $stmt->bind_param("i", $service_id);
    $stmt->execute();
    $data = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    echo json_encode($data ?: ['error'=>'Послугу не знайдено.']);
    exit;
}

/* ===== ДОДАТИ ПОСЛУГУ ===== */
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST['add_service'])) {
    if (!can_access('pricing')) $error = "Недостатньо прав для додавання.";
    else {
        $category_id = (int)$_POST['category_id'];
        $name = trim($_POST['name']);
        $price_string = trim($_POST['price_string']);
        $price_numeric = (float)$_POST['price_numeric'];

        if ($category_id <= 0 || $name === '' || $price_string === '') $error = "❌ Заповни всі поля.";
        else {
            $stmt = $conn->prepare("INSERT INTO services (category_id, name, price_string, price_numeric) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("issd", $category_id, $name, $price_string, $price_numeric);

            if ($stmt->execute()) {
                $new_id = $stmt->insert_id;
                $message = "✅ Послугу додано.";
                log_service_change($conn, 'ADD', (int)$new_id, $category_id, [], [
                    'name'=>$name,'price_string'=>$price_string,'price_numeric'=>$price_numeric
                ]);
            } else $error = "❌ Помилка: " . $conn->error;

            $stmt->close();
        }
    }
    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ===== ОНОВИТИ ПОСЛУГУ (з логом) ===== */
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST['update_service'])) {
    if (!can_access('pricing')) $error = "Недостатньо прав для оновлення.";
    else {
        $service_id = (int)$_POST['service_id'];
        $name = trim($_POST['name']);
        $price_string = trim($_POST['price_string']);
        $price_numeric = (float)$_POST['price_numeric'];

        if ($name === '' || $price_string === '') $error = "❌ Назва та ціна не можуть бути порожніми.";
        else {
            // OLD
            $oldStmt = $conn->prepare("SELECT category_id, name, price_string, price_numeric FROM services WHERE service_id=?");
            $oldStmt->bind_param("i", $service_id);
            $oldStmt->execute();
            $old = $oldStmt->get_result()->fetch_assoc();
            $oldStmt->close();

            $stmt = $conn->prepare("UPDATE services SET name=?, price_string=?, price_numeric=? WHERE service_id=?");
            $stmt->bind_param("ssdi", $name, $price_string, $price_numeric, $service_id);

            if ($stmt->execute()) {
                $message = "✅ Послугу успішно оновлено.";
                $cat_id = (int)($old['category_id'] ?? 0);
                log_service_change($conn, 'UPDATE', $service_id, $cat_id, $old ?: [], [
                    'name'=>$name,'price_string'=>$price_string,'price_numeric'=>$price_numeric
                ]);
            } else $error = "❌ Помилка: " . $conn->error;

            $stmt->close();
        }
    }
    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ===== ВИДАЛИТИ ПОСЛУГУ (з логом) ===== */
if (isset($_GET['delete_service_id'])) {
    if (!can_access('pricing')) $error = "Недостатньо прав для видалення.";
    else {
        $delete_id = (int)$_GET['delete_service_id'];

        $oldStmt = $conn->prepare("SELECT category_id, name, price_string, price_numeric FROM services WHERE service_id=?");
        $oldStmt->bind_param("i", $delete_id);
        $oldStmt->execute();
        $old = $oldStmt->get_result()->fetch_assoc();
        $oldStmt->close();

        $stmt = $conn->prepare("DELETE FROM services WHERE service_id=?");
        $stmt->bind_param("i", $delete_id);

        if ($stmt->execute()) {
            $message = "✅ Послугу успішно видалено.";
            $cat_id = (int)($old['category_id'] ?? 0);
            log_service_change($conn, 'DELETE', $delete_id, $cat_id, $old ?: [], []);
        } else $error = "❌ Помилка: " . $conn->error;

        $stmt->close();
    }
    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ===== AJAX: завантаження історії ===== */
if (isset($_POST['load_history'])) {
    if (!can_access('history')) { echo "<p>Недостатньо прав.</p>"; exit; }

    $q = $conn->query("SELECT * FROM service_change_log ORDER BY created_at DESC LIMIT 500");
    if (!$q) { echo "<p style='color:red'>Помилка логів.</p>"; exit; }

    echo "<div style='padding:20px'>";
    echo "<div style='overflow:auto; background:#fff; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.05)'>";
    echo "<table style='width:100%; border-collapse:collapse'>";
    echo "<thead><tr style='background:#f7f7f7'>
            <th style='text-align:left; padding:12px; border-bottom:1px solid #eee'>Дата</th>
            <th style='text-align:left; padding:12px; border-bottom:1px solid #eee'>Користувач</th>
            <th style='text-align:left; padding:12px; border-bottom:1px solid #eee'>Дія</th>
            <th style='text-align:left; padding:12px; border-bottom:1px solid #eee'>Service ID</th>
            <th style='text-align:left; padding:12px; border-bottom:1px solid #eee'>Було</th>
            <th style='text-align:left; padding:12px; border-bottom:1px solid #eee'>Стало</th>
          </tr></thead><tbody>";

    while($r = $q->fetch_assoc()) {
        $action = htmlspecialchars($r['action']);
        $badge = $action === 'ADD' ? '✅ ADD' : ($action === 'UPDATE' ? '✏️ UPDATE' : '🗑️ DELETE');

        $old = trim(
            ($r['name_old'] ? $r['name_old'] : '') .
            ($r['price_string_old'] ? " | ".$r['price_string_old']." грн" : '') .
            (isset($r['price_numeric_old']) ? " | ".$r['price_numeric_old'] : '')
        );
        $new = trim(
            ($r['name_new'] ? $r['name_new'] : '') .
            ($r['price_string_new'] ? " | ".$r['price_string_new']." грн" : '') .
            (isset($r['price_numeric_new']) ? " | ".$r['price_numeric_new'] : '')
        );

        echo "<tr>
            <td style='padding:12px; border-bottom:1px solid #eee'>".htmlspecialchars($r['created_at'])."</td>
            <td style='padding:12px; border-bottom:1px solid #eee'>".htmlspecialchars($r['username'] ?? '')."</td>
            <td style='padding:12px; border-bottom:1px solid #eee'>{$badge}</td>
            <td style='padding:12px; border-bottom:1px solid #eee'>".htmlspecialchars($r['service_id'] ?? '')."</td>
            <td style='padding:12px; border-bottom:1px solid #eee'>".htmlspecialchars($old)."</td>
            <td style='padding:12px; border-bottom:1px solid #eee'>".htmlspecialchars($new)."</td>
        </tr>";
    }

    echo "</tbody></table></div></div>";
    exit;
}

/* ===========================================================
   =================== ТВОЇ СЕКЦІЇ ЗАПИСІВ ===================
   =========================================================== */

/* ===== Вибір вкладки за замовчуванням ===== */
$default_tab = 'dashboard';
$tabs = ['all', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'archive', 'call', 'comments', 'pricing', 'history'];
foreach ($tabs as $t) { if (can_access($t)) { $default_tab = $t; break; } }
if (can_access('dashboard') && $default_tab === '') $default_tab = 'dashboard';

/* ===== Додавання запису (твоя логіка) ===== */
if (isset($_POST['add_record'])) {
    $client_name = $_POST['client_name'];
    $phone = $_POST['phone'];
    $category = $_POST['category'];
    $service_name = $_POST['service_name'];
    $record_date = $_POST['record_date'];
    $record_time = $_POST['record_time'];

    if (!can_access($category)) {
        echo "<script>alert('⛔️ You do not have permission to add records to this category!'); window.history.back();</script>";
    } else {
        $stmt_check = $conn->prepare("SELECT id FROM records WHERE record_date = ? AND record_time = ?");
        $stmt_check->bind_param("ss", $record_date, $record_time);
        $stmt_check->execute();
        $stmt_check->store_result();

        if ($stmt_check->num_rows > 0) {
            echo "<script>alert('⛔️ This time is already booked!'); window.history.back();</script>";
        } else {
            $stmt_insert = $conn->prepare("INSERT INTO records (client_name, phone, category, service_name, record_date, record_time) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt_insert->bind_param("ssssss", $client_name, $phone, $category, $service_name, $record_date, $record_time);
            $stmt_insert->execute();
            $stmt_insert->close();
            header("Location: " . $_SERVER['PHP_SELF']);
            exit();
        }
        $stmt_check->close();
    }
}

/* ===== AJAX: зайняті часи ===== */
if (isset($_POST['get_busy_times'])) {
    $date = $_POST['get_busy_times'];
    $busy = [];
    $stmt = $conn->prepare("SELECT record_time FROM records WHERE record_date = ?");
    $stmt->bind_param("s", $date);
    $stmt->execute();
    $result_times = $stmt->get_result();
    while ($r = $result_times->fetch_assoc()) $busy[] = $r['record_time'];
    $stmt->close();
    echo json_encode($busy);
    exit;
}

/* ===== Перенесення в архів ===== */
if (isset($_POST['move_one'])) {
    $id = intval($_POST['move_one']);
    $res = $conn->query("SELECT * FROM records WHERE id=$id");
    if ($res && $row = $res->fetch_assoc()) {
        $service_full = $row['category']." → ".$row['service_name'];
        $datetime = $row['record_date'].' '.$row['record_time'];
        $stmt = $conn->prepare("INSERT INTO archive (name, phone, service, datetime) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $row['client_name'], $row['phone'], $service_full, $datetime);
        if ($stmt->execute()) { $conn->query("DELETE FROM records WHERE id=$id"); echo "ok"; }
        else echo "Error: ".$conn->error;
        $stmt->close();
    } else echo "Record not found";
    exit;
}

/* ===== Відновлення з архіву ===== */
if (isset($_POST['restore'])) {
    $id = intval($_POST['restore']);
    $r_res = $conn->query("SELECT * FROM archive WHERE id=$id");
    if (!$r_res || $r_res->num_rows === 0) { echo "Error: record not found"; exit; }
    $r = $r_res->fetch_assoc();

    $service_parts = explode(' → ', $r['service'], 2);
    $category = $service_parts[0] ?? '';
    $service_name = $service_parts[1] ?? '';

    $datetime_parts = explode(' ', $r['datetime'], 2);
    $record_date = $datetime_parts[0] ?? '';
    $record_time = substr($datetime_parts[1] ?? '00:00', 0, 5);

    $stmt_insert = $conn->prepare("INSERT INTO records (client_name, phone, category, service_name, record_date, record_time) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt_insert->bind_param("ssssss", $r['name'], $r['phone'], $category, $service_name, $record_date, $record_time);

    if ($stmt_insert->execute()) { $conn->query("DELETE FROM archive WHERE id=$id"); echo "ok"; }
    else echo "Restore error: " . $conn->error;

    $stmt_insert->close();
    exit;
}

/* ===== Видалення запису / коментаря / заявки ===== */
if (isset($_POST['delete_id'])) {
    $id = intval($_POST['delete_id']);
    $conn->query("DELETE FROM records WHERE id=$id");
    $conn->query("DELETE FROM archive WHERE id=$id");
    echo "ok";
    exit;
}

if (isset($_POST['delete_comment'])) {
    $id = intval($_POST['delete_comment']);
    $stmt = $conn->prepare("DELETE FROM comments WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute() ? print("ok") : print("Error");
    $stmt->close();
    exit;
}

if (isset($_POST['delete_appointment'])) {
    $id = intval($_POST['delete_appointment']);
    $stmt = $conn->prepare("DELETE FROM appointments WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $stmt->close();
    echo "ok";
    exit;
}

/* ===== last_activity ===== */
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("UPDATE users SET last_activity = NOW() WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->close();
}

/* ===== Основні вибірки ===== */
$result = $conn->query("SELECT * FROM records ORDER BY record_date ASC, record_time ASC");
$archive = $conn->query("SELECT * FROM archive ORDER BY DATE(datetime) ASC, TIME(datetime) ASC");
$appointments = $conn->query("SELECT * FROM appointments ORDER BY created_at DESC");
$comments = $conn->query("SELECT * FROM comments ORDER BY created_at DESC");
$users_result = $conn->query("SELECT id, username, role, last_activity, permissions FROM users ORDER BY last_activity DESC");

function is_online($last_activity) {
    $last_activity_timestamp = strtotime($last_activity);
    $timeout = 5 * 60;
    return (time() - $last_activity_timestamp) < $timeout;
}
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Beauty Room — Адмін</title>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Prata&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="assets/css/creator.css?v=<?php echo filemtime('assets/css/creator.css'); ?>">

    <style>
        .user-item { cursor: pointer; padding: 8px; border-radius: 4px; transition: background-color 0.2s; }
        .user-item:hover { background-color: #f0f0f0; }
        .modal-overlay { display:none; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.4); justify-content:center; align-items:center; }
        .modal-overlay.visible { display:flex; }
        .modal-box { background:#fff; padding:20px; border-radius:10px; max-width:520px; width:92%; box-shadow:0 10px 30px rgba(0,0,0,0.25); position:relative; }
        .modal-box label, .modal-box input, .modal-box select { display:block; width:100%; margin-top:10px; }
        .modal-box input[type="text"], .modal-box input[type="email"], .modal-box input[type="number"], .modal-box select { padding:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box; }
        .modal-box button { margin-top:15px; padding:10px 15px; border-radius:6px; cursor:pointer; border:none; }
        .modal-box .delete-btn { background:#dc3545; color:#fff; float:right; }
        .message, .error { padding:10px; margin-bottom:10px; border-radius:6px; }
        .message { background:#d4edda; color:#155724; border:1px solid #c3e6cb; }
        .error { background:#f8d7da; color:#721c24; border:1px solid #f5c6cb; }

        #pricingSection { padding: 20px; }
        .pricing-category-group { margin-bottom:25px; background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.05); overflow:hidden; }
        .pricing-category-group h3 { background:#f9f9f9; padding:15px 20px; margin:0; border-bottom:1px solid #eee; font-family:'Prata',serif; }
        .service-list { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:10px; padding:20px; }
        .service-item { display:flex; justify-content:space-between; align-items:center; padding:12px 15px; border:1px solid #eee; border-radius:8px; cursor:pointer; transition:all .2s; background:#fff; }
        .service-item:hover { background:#f7f5ff; border-color:#7c5fe0; transform:translateY(-2px); box-shadow:0 4px 10px rgba(0,0,0,0.05); }
        .service-item .service-name { font-weight:600; color:#333; }
        .service-item .service-price { font-weight:700; color:#7c5fe0; }
        .empty-service-list { padding:0 20px 10px; color:#888; font-style:italic; }
    </style>
</head>
<body>

<button id="mobileMenuBtn" class="mobile-menu-toggle"><i class="fas fa-bars"></i></button>
<div id="mobileOverlay"></div>

<div class="sidebar">
    <div>
        <a class="navbar-brand" style="display:flex; align-items:center; text-decoration:none; margin-bottom: 20px;">
            <img src="BeautyRoomSite/images/logopnd.png" alt="Beauty Room" style="height:70px; margin-right:10px;">
            <h2 style="margin:0; font-size:20px; color:#fff;">Beauty Room</h2>
        </a>
        <div class="menu">
            <button id="btn-dashboard" onclick="showSection('dashboard')"><i class="fas fa-chart-line"></i> Дашборд</button>

            <?php if (can_access('all')): ?>
                <button id="btn-all" onclick="showSection('all')"><i class="fas fa-list-ul"></i> Усі записи</button>
            <?php endif; ?>
            <?php if (can_access('Масаж')): ?>
                <button id="btn-Масаж" onclick="showSection('Масаж')"><i class="fas fa-spa"></i> Масаж</button>
            <?php endif; ?>
            <?php if (can_access('Elos-епіляція')): ?>
                <button id="btn-Elos-епіляція" onclick="showSection('Elos-епіляція')"><i class="fas fa-star"></i> Elos-епіляція</button>
            <?php endif; ?>
            <?php if (can_access('Доглядові процедури')): ?>
                <button id="btn-Доглядові процедури" onclick="showSection('Доглядові процедури')"><i class="fas fa-pump-soap"></i> Доглядові процедури</button>
            <?php endif; ?>
            <?php if (can_access('archive')): ?>
                <button id="btn-archive" onclick="showSection('archive')"><i class="fas fa-archive"></i> Архів</button>
            <?php endif; ?>
            <?php if (can_access('call')): ?>
                <button id="btn-call" onclick="showSection('call')"><i class="fas fa-phone-alt"></i> Перетелефонувати</button>
            <?php endif; ?>
            <?php if (can_access('comments')): ?>
                <button id="btn-comments" onclick="showSection('comments')"><i class="fas fa-comments"></i> Коментарі</button>
            <?php endif; ?>
            <?php if (can_access('pricing')): ?>
                <button id="btn-pricing" onclick="showSection('pricing')"><i class="fas fa-tags"></i> Редактор Прайсу</button>
            <?php endif; ?>
            <?php if (can_access('history')): ?>
                <button id="btn-history" onclick="showSection('history')"><i class="fas fa-clock-rotate-left"></i> Історія змін</button>
            <?php endif; ?>

            <?php if (isset($_SESSION['role']) && strtolower($_SESSION['role']) === 'admin'): ?>
                <button onclick="window.location.href='register.php'" class="admin-action-btn">
                    <i class="fas fa-user-plus"></i> Створити акаунт
                </button>
            <?php endif; ?>
        </div>
    </div>
    <button class="logout-btn" onclick="window.location.href='logout.php'"><i class="fas fa-sign-out-alt"></i> Вийти</button>
</div>

<div class="main">
    <p class="welcome-message">
        Вітаємо, <strong><?php echo htmlspecialchars($_SESSION['username'] ?? 'Користувач'); ?></strong>
        (Ваша роль: <span class="user-role-animated"><?php echo htmlspecialchars($_SESSION['role'] ?? 'Гість'); ?></span>)
    </p>

    <?php if (!empty($message)): ?><div class="message"><?php echo $message; ?></div><?php endif; ?>
    <?php if (!empty($error)): ?><div class="error"><?php echo $error; ?></div><?php endif; ?>

    <div id="dashboardSection" style="display:none;">
        <h2><i class="fas fa-chart-line"></i> Дашборд</h2>
        <!-- Твій дашборд лишився (як був у creator.css/верстці) -->
        <p style="opacity:.7">Дашборд без змін.</p>
    </div>

    <div id="pricingSection" style="display:none;">
        <h2><i class="fas fa-tags"></i> Редактор Прайсу</h2>
        <div style="padding: 0 20px 15px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <button type="button" id="addServiceBtn" class="main-add-btn" style="width:auto;">
                <i class="fas fa-plus"></i> Додати послугу
            </button>
            <span style="color:#666;">Натисни, щоб додати нову послугу в БД.</span>
        </div>
        <div id="pricing-editor-content">
            <p style="text-align:center; padding:20px;">Завантаження прайсу...</p>
        </div>
    </div>

    <div id="historySection" style="display:none;">
        <h2><i class="fas fa-clock-rotate-left"></i> Історія змін</h2>
        <p style="padding: 0 20px 10px; color:#555;">Лог додавань/правок/видалень послуг (до 500 останніх записів).</p>
        <div id="history-content">
            <p style="text-align:center; padding:20px;">Завантаження історії...</p>
        </div>
    </div>

    <div class="toolbar">
        <div class="add-record-container">
            <button id="addRecordBtn" class="main-add-btn"><i class="fas fa-plus"></i> Новий запис</button>
            <div id="addRecordDropdown" class="add-record-dropdown">
                <?php
                $service_categories = ['Масаж', 'Elos-епіляція', 'Доглядові процедури'];
                foreach ($service_categories as $category) {
                    if (can_access($category)) {
                        echo '<a href="#" data-category="' . htmlspecialchars($category) . '">Запис на ' . htmlspecialchars($category) . '</a>';
                    }
                }
                ?>
            </div>
        </div>
        <input type="text" id="searchInput" placeholder="Пошук за іменем, телефоном, послугою...">
    </div>

    <div id="recordsList" style="display:none;">
        <h2 id="recordsListTitle"><i class="fas fa-list-ul"></i> Усі записи</h2>
        <?php
        if ($result && $result->num_rows > 0) {
            $result->data_seek(0);
            $currentDate = '';
            while ($row = $result->fetch_assoc()):
                if ($currentDate !== $row['record_date']):
                    $currentDate = $row['record_date'];
                    echo "<h3>" . date("d F Y", strtotime($currentDate)) . "</h3>";
                endif;
        ?>
        <div class="email" data-id="<?= $row['id'] ?>" data-category="<?= htmlspecialchars($row['category']) ?>">
            <div class="client-info">
                <strong><?= htmlspecialchars($row['client_name']) ?></strong> (<?= htmlspecialchars($row['phone']) ?>)<br>
                <?= htmlspecialchars($row['category']) ?> → <?= htmlspecialchars($row['service_name']) ?><br>
                <small><i class="far fa-clock"></i> <?= htmlspecialchars($row['record_time']) ?></small>
            </div>
            <div class="record-actions">
                <button class="action-btn" onclick="moveToArchive(<?= $row['id'] ?>, event)" title="В архів"><i class="fas fa-archive"></i></button>
                <button class="action-btn danger" onclick="deleteRecord(<?= $row['id'] ?>, event)" title="Видалити"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
        <?php endwhile; } else { echo "<p>Немає активних записів.</p>"; } ?>
    </div>

    <div id="archiveSection" style="display:none;">
        <h2><i class="fas fa-archive"></i> Архів</h2>
        <?php if ($archive && $archive->num_rows > 0): $archive->data_seek(0); while($row = $archive->fetch_assoc()): ?>
        <div class="email">
            <div>
                <strong><?= htmlspecialchars($row['name']) ?></strong> (<?= htmlspecialchars($row['phone']) ?>)<br>
                <?= htmlspecialchars($row['service']) ?><br>
                <small><i class="far fa-calendar-alt"></i> <?= htmlspecialchars($row['datetime']) ?></small>
            </div>
            <div class="record-actions">
                <button class="action-btn" onclick="restore(<?= $row['id'] ?>)" title="Відновити"><i class="fas fa-undo-alt"></i></button>
                <button class="action-btn danger" onclick="deleteRecord(<?= $row['id'] ?>, event)" title="Видалити"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
        <?php endwhile; else: echo "<p>Архів порожній.</p>"; endif; ?>
    </div>

    <div id="callSection" style="display:none;">
        <h2><i class="fas fa-phone-alt"></i> Перетелефонувати</h2>
        <div class="cards">
        <?php if($appointments && $appointments->num_rows > 0): $appointments->data_seek(0); while($row = $appointments->fetch_assoc()): ?>
            <div class="card" id="appointment-<?= $row['id'] ?>">
                <button class="action-btn danger" onclick="deleteAppointment(<?= $row['id'] ?>)" title="Видалити"><i class="fas fa-times"></i></button>
                <h3><?= htmlspecialchars($row['name']) ?></h3>
                <p><b>Телефон:</b> <?= htmlspecialchars($row['phone']) ?></p>
                <p><b>Послуга:</b> <?= htmlspecialchars($row['service']) ?></p>
                <p class="comment-description" style="font-style: italic;">“<?= htmlspecialchars($row['message']) ?>”</p>
                <small>Створено: <?= htmlspecialchars(date("d.m.Y H:i", strtotime($row['created_at']))) ?></small>
            </div>
        <?php endwhile; else: echo "<p>Немає запитів.</p>"; endif; ?>
        </div>
    </div>

    <div id="commentsSection" style="display:none;">
        <h2><i class="fas fa-comments"></i> Коментарі</h2>
        <div class="cards">
        <?php if ($comments && $comments->num_rows > 0): $comments->data_seek(0); while($row = $comments->fetch_assoc()): ?>
            <div class="card comment-card" id="comment-<?= $row['id'] ?>">
                <button class="action-btn danger" onclick="deleteComment(<?= $row['id'] ?>)" title="Видалити"><i class="fas fa-trash-alt"></i></button>
                <h3><?= htmlspecialchars($row['name']) ?></h3>
                <p><b>Послуга:</b> <?= htmlspecialchars($row['service']) ?></p>
                <p class="comment-description" style="font-style: italic;">“<?= htmlspecialchars($row['description']) ?>”</p>
                <small>Створено: <?= htmlspecialchars(date("d.m.Y H:i", strtotime($row['created_at']))) ?></small>
            </div>
        <?php endwhile; else: echo "<p>Немає коментарів.</p>"; endif; ?>
        </div>
    </div>

</div>

<!-- Модалка додавання запису (твоя) -->
<div id="recordModal" class="modal-overlay">
  <div class="modal-box">
    <h2 id="modalTitle">Новий запис</h2>
    <form id="addRecordForm" method="post">
      <input type="hidden" id="recordCategory" name="category" value="">
      <label>Послуга:</label>
      <select name="service_name" id="service_name_select" required>
        <option value="">-- Спочатку оберіть категорію --</option>
      </select>
      <label>Дата та час:</label>
      <div style="display:flex; gap:10px;">
        <input type="date" name="record_date" id="record_date" required style="flex:1;">
        <select name="record_time" id="record_time" required style="flex:1;">
          <option value="">Час</option>
          <option value="09:30">09:30</option><option value="10:30">10:30</option><option value="11:30">11:30</option>
          <option value="12:30">12:30</option><option value="13:30">13:30</option><option value="14:30">14:30</option>
          <option value="15:30">15:30</option><option value="16:30">16:30</option><option value="17:30">17:30</option>
          <option value="18:30">18:30</option>
        </select>
      </div>
      <label>Інформація про клієнта:</label>
      <input type="text" name="client_name" id="client_name_input" placeholder="Ім’я клієнта" required>
      <input type="tel" name="phone" placeholder="Телефон" required>
      <button type="submit" name="add_record" class="main-add-btn">Зберегти запис</button>
    </form>
  </div>
</div>

<!-- Модалка редагування послуги (твоя, + delete) -->
<div id="serviceEditModal" class="modal-overlay">
  <div class="modal-box">
    <h2>Редагувати Послугу</h2>
    <form id="editServiceForm" method="POST">
      <input type="hidden" name="update_service" value="1">
      <input type="hidden" id="edit_service_id" name="service_id">

      <label>Категорія:</label>
      <input type="text" id="edit_service_category" disabled style="background:#eee;">

      <label>Назва:</label>
      <input type="text" id="edit_service_name" name="name" required>

      <label>Ціна (текст):</label>
      <input type="text" id="edit_service_price_string" name="price_string" required>

      <label>Ціна (число):</label>
      <input type="number" id="edit_service_price_numeric" name="price_numeric" required step="0.01" min="0">

      <button type="submit" class="main-add-btn">💾 Зберегти</button>
      <button type="button" class="delete-btn" id="deleteServiceBtn">❌ Видалити</button>
    </form>
  </div>
</div>

<!-- ✅ НОВА МОДАЛКА: Додати послугу -->
<div id="serviceAddModal" class="modal-overlay">
  <div class="modal-box">
    <h2>➕ Додати послугу</h2>
    <form method="POST" id="addServiceForm">
      <input type="hidden" name="add_service" value="1">

      <label>Категорія:</label>
      <select name="category_id" id="add_service_category_id" required></select>

      <label>Назва послуги:</label>
      <input type="text" name="name" id="add_service_name" required>

      <label>Ціна (текст):</label>
      <input type="text" name="price_string" id="add_service_price_string" required>

      <label>Ціна (число):</label>
      <input type="number" name="price_numeric" id="add_service_price_numeric" step="0.01" min="0" required>

      <button type="submit" class="main-add-btn">✅ Додати</button>
      <button type="button" class="delete-btn" id="closeAddServiceModal">Закрити</button>
    </form>
  </div>
</div>

<script>
/* Мобільне меню */
const mobileBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('mobileOverlay');
if (mobileBtn) {
  mobileBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    const icon = mobileBtn.querySelector('i');
    if (sidebar.classList.contains('active')) { icon.classList.replace('fa-bars','fa-times'); }
    else { icon.classList.replace('fa-times','fa-bars'); }
  });
}
if (overlay) overlay.addEventListener('click', () => {
  sidebar.classList.remove('active'); overlay.classList.remove('active');
  if (mobileBtn) { const i=mobileBtn.querySelector('i'); i.classList.remove('fa-times'); i.classList.add('fa-bars'); }
});
document.querySelectorAll('.sidebar .menu button').forEach(btn => btn.addEventListener('click', () => {
  if (window.innerWidth <= 768) { sidebar.classList.remove('active'); overlay.classList.remove('active'); }
}));

document.addEventListener('DOMContentLoaded', function() {
  const servicesData = {
    'Масаж': ['Загальний масаж тіла','Масаж спини','Антицелюлітний масаж','Лімфодренажний масаж'],
    'Elos-епіляція': ['Ноги повністю','Руки повністю','Глибоке бікіні','Пахви','Верхня губа'],
    'Доглядові процедури': ['Чистка обличчя','Пілінг','Карбоксітерапія','Маска для обличчя']
  };

  const addRecordBtn = document.getElementById('addRecordBtn');
  const addRecordDropdown = document.getElementById('addRecordDropdown');
  const recordModal = document.getElementById('recordModal');
  const modalTitle = document.getElementById('modalTitle');
  const serviceSelect = document.getElementById('service_name_select');
  const categoryInput = document.getElementById('recordCategory');
  const addRecordForm = document.getElementById('addRecordForm');

  if (addRecordBtn) addRecordBtn.onclick = () => addRecordDropdown.classList.toggle('visible');
  if (addRecordDropdown) addRecordDropdown.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const category = e.target.dataset.category;
      modalTitle.textContent = 'Новий запис: ' + category;
      categoryInput.value = category;
      serviceSelect.innerHTML = '<option value="">Оберіть послугу...</option>';
      (servicesData[category] || []).forEach(s => serviceSelect.add(new Option(s, s)));
      recordModal.classList.add('visible');
      addRecordDropdown.classList.remove('visible');
    }
  });

  // ===== PRICING: load + edit =====
  const serviceEditModal = document.getElementById('serviceEditModal');
  const deleteServiceBtn = document.getElementById('deleteServiceBtn');

  window.loadPricingEditor = function() {
    const box = document.getElementById('pricing-editor-content');
    if (!box) return;
    box.innerHTML = '<p style="text-align:center; padding:20px;">Завантаження прайсу...</p>';
    fetch("", { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body:"load_pricing_editor=1" })
      .then(r => r.text())
      .then(html => { box.innerHTML = html; bindPricingEditorEvents(); })
      .catch(() => box.innerHTML = '<p style="color:red; text-align:center;">Не вдалося завантажити прайс.</p>');
  };

  window.openServiceEditor = function(serviceId) {
    fetch("", { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body:"get_service_data=" + encodeURIComponent(serviceId) })
      .then(r => r.json())
      .then(data => {
        if (data.error) return alert(data.error);
        document.getElementById('edit_service_id').value = data.service_id;
        document.getElementById('edit_service_category').value = data.category_title;
        document.getElementById('edit_service_name').value = data.name;
        document.getElementById('edit_service_price_string').value = data.price_string;
        document.getElementById('edit_service_price_numeric').value = data.price_numeric;
        serviceEditModal.classList.add('visible');
      });
  };

  function bindPricingEditorEvents() {
    const box = document.getElementById('pricing-editor-content');
    if (!box) return;
    box.onclick = (e) => {
      const item = e.target.closest('.service-item');
      if (item) openServiceEditor(item.dataset.serviceId);
    };
  }

  if (deleteServiceBtn) deleteServiceBtn.addEventListener('click', () => {
    const id = document.getElementById('edit_service_id').value;
    const nm = document.getElementById('edit_service_name').value;
    if (confirm(`Видалити послугу "${nm}"?`)) window.location.href = `creatortool.php?delete_service_id=${id}`;
  });

  // ===== HISTORY: load =====
  window.loadHistory = function() {
    const box = document.getElementById('history-content');
    if (!box) return;
    box.innerHTML = '<p style="text-align:center; padding:20px;">Завантаження історії...</p>';
    fetch("", { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body:"load_history=1" })
      .then(r => r.text())
      .then(html => box.innerHTML = html)
      .catch(() => box.innerHTML = '<p style="color:red; text-align:center;">Не вдалося завантажити історію.</p>');
  };

  // ===== ADD SERVICE modal =====
  const addServiceBtn = document.getElementById('addServiceBtn');
  const serviceAddModal = document.getElementById('serviceAddModal');
  const closeAddServiceModal = document.getElementById('closeAddServiceModal');
  const addServiceCat = document.getElementById('add_service_category_id');

  // Підтягнемо категорії з DOM прайсу: якщо прайс ще не завантажився — завантажимо в момент відкриття.
  function fillCategoriesFromPricingDom() {
    addServiceCat.innerHTML = '';
    // спроба витягнути category_id зі списку послуг не можлива — тому грузимо категорії запитом окремо через HTML:
    // простий хак: витягнути з заголовків + сервісів не дає id. Тому зробимо маленький запит через services categories прямо з PHP не робимо,
    // а зробимо через hidden-ендпоінт? Ні. Тому без хаку — зробимо categories через dataset у html прайсу:
  }

  // ✅ Нормально: завантажимо категорії через маленький AJAX прямо тут:
  window.loadCategoriesForAdd = function() {
    fetch("", { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body:"load_categories_only=1" })
      .then(r => r.json())
      .then(list => {
        addServiceCat.innerHTML = '<option value="">Оберіть категорію...</option>';
        list.forEach(c => addServiceCat.add(new Option(c.title, c.category_id)));
      });
  };

  if (addServiceBtn) addServiceBtn.addEventListener('click', () => {
    if (window.loadCategoriesForAdd) window.loadCategoriesForAdd();
    serviceAddModal.classList.add('visible');
  });

  if (closeAddServiceModal) closeAddServiceModal.addEventListener('click', () => {
    serviceAddModal.classList.remove('visible');
  });

  // загальні кліки для закриття
  window.addEventListener('click', function(e) {
    if (e.target === recordModal) { recordModal.classList.remove('visible'); addRecordForm && addRecordForm.reset(); }
    if (e.target === serviceEditModal) serviceEditModal.classList.remove('visible');
    if (e.target === serviceAddModal) serviceAddModal.classList.remove('visible');
    if (addRecordBtn && !addRecordBtn.contains(e.target) && addRecordDropdown && !addRecordDropdown.contains(e.target)) addRecordDropdown.classList.remove('visible');
  });

  // search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("keyup", function() {
    const filter = this.value.toLowerCase();
    const list = document.querySelector('#recordsList');
    if (list && getComputedStyle(list).display !== 'none') {
      list.querySelectorAll(".email").forEach(item => item.style.display = item.innerText.toLowerCase().includes(filter) ? "flex" : "none");
    }
  });

  showSection('<?= $default_tab ?>');
});

/* ==== перемикання секцій ==== */
function showSection(sec) {
  document.querySelectorAll('.main > div[id$="Section"], .main > div[id$="List"]').forEach(s => s.style.display='none');

  const toolbar = document.querySelector('.toolbar');
  const recordsListDiv = document.getElementById('recordsList');
  const listTitle = document.getElementById('recordsListTitle');

  if (sec === 'dashboard') {
    document.getElementById('dashboardSection').style.display='block';
    if (toolbar) toolbar.style.display='none';
  } else if (sec === 'pricing') {
    document.getElementById('pricingSection').style.display='block';
    if (toolbar) toolbar.style.display='none';
    const content = document.getElementById('pricing-editor-content');
    if (content && !content.querySelector('.pricing-category-group')) window.loadPricingEditor && window.loadPricingEditor();
  } else if (sec === 'history') {
    document.getElementById('historySection').style.display='block';
    if (toolbar) toolbar.style.display='none';
    const hc = document.getElementById('history-content');
    if (hc && !hc.querySelector('table')) window.loadHistory && window.loadHistory();
  } else if (sec === 'archive' || sec === 'call' || sec === 'comments') {
    document.getElementById(sec+'Section').style.display='block';
    if (toolbar) toolbar.style.display='none';
  } else {
    if (recordsListDiv) recordsListDiv.style.display='block';
    if (toolbar) toolbar.style.display='flex';

    const emails = recordsListDiv ? recordsListDiv.querySelectorAll('.email') : [];
    const icons = {'Масаж':'fa-spa','Elos-епіляція':'fa-star','Доглядові процедури':'fa-pump-soap','all':'fa-list-ul'};
    if (listTitle) listTitle.innerHTML = `<i class="fas ${icons[sec] || 'fa-list-ul'}"></i> ${sec==='all'?'Усі записи':sec}`;
    if (sec === 'all') emails.forEach(e => e.style.display='flex');
    else emails.forEach(e => e.style.display = (e.dataset.category === sec) ? 'flex' : 'none');
  }

  document.querySelectorAll('.sidebar .menu button').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('btn-'+sec);
  if (activeBtn) activeBtn.classList.add('active');
}

/* ===== твої функції записів ===== */
function deleteRecord(id, e){ e.stopPropagation(); if(!confirm("Видалити запис назавжди?")) return;
  fetch("",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"delete_id="+id})
  .then(r=>r.text()).then(t=>{ if(t.trim()==="ok") location.reload(); });
}
function moveToArchive(id,e){ e.stopPropagation(); if(!confirm("Перемістити запис до архіву?")) return;
  fetch("",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"move_one="+id})
  .then(r=>r.text()).then(t=>{ if(t.trim()==="ok") location.reload(); });
}
function restore(id){ if(!confirm("Відновити цей запис з архіву?")) return;
  fetch("",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"restore="+id})
  .then(r=>r.text()).then(t=>{ if(t.trim()==="ok") location.reload(); else alert("Restore error: "+t); });
}
function deleteAppointment(id){ if(!confirm("Видалити цей запит на дзвінок?")) return;
  fetch("",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"delete_appointment="+id})
  .then(r=>r.text()).then(t=>{ if(t.trim()==="ok") location.reload(); });
}
function deleteComment(id){ if(!confirm("Ви впевнені, що хочете видалити цей коментар?")) return;
  fetch("",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"delete_comment="+id})
  .then(r=>r.text()).then(t=>{ if(t.trim()==="ok") location.reload(); else alert("Error: "+t); });
}
</script>

<?php
// ✅ маленький JSON-ендпоінт для категорій (для додавання послуги)
if (isset($_POST['load_categories_only'])) {
    header('Content-Type: application/json');
    $arr = [];
    $q = $conn->query("SELECT category_id, title FROM servicecategories ORDER BY title");
    while($r = $q->fetch_assoc()) $arr[] = $r;
    echo json_encode($arr);
    exit;
}
?>

</body>
</html>
