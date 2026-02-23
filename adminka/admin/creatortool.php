<?php
session_start();

define("HOST", "dg602726.mysql.tools");
define("USER", "dg602726_salon");
define("PASSWORD", "C4cxy5D^+8");
define("DB", "dg602726_salon");

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

if (strtolower($_SESSION['role']) !== 'admin' && strtolower($_SESSION['role']) !== 'creator') {
    echo "Недостатньо прав доступу.";
    exit();
}

$conn = new mysqli(HOST, USER, PASSWORD, DB);
if ($conn->connect_error) {
    die("Помилка підключення: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

$message = '';
$error = '';

if (isset($_GET['message'])) $message = htmlspecialchars($_GET['message']);
if (isset($_GET['error'])) $error = htmlspecialchars($_GET['error']);

$user_permissions = [];
if (!empty($_SESSION['permissions'])) {
    $user_permissions = array_map('trim', explode(',', $_SESSION['permissions']));
}

function can_access($tab) {
    global $user_permissions;
    if (isset($_SESSION['role']) && strtolower($_SESSION['role']) === 'admin') {
        return true;
    }
    if ($tab === 'all' && in_array('all', $user_permissions)) {
        return true;
    }
    return in_array($tab, $user_permissions);
}

/* ===== ЛОГУВАННЯ ЗМІН ПОСЛУГ ===== */
function log_service_change($conn, $action, $service_id, $old = null, $new = null) {
    $user_id = $_SESSION['user_id'] ?? null;
    $username = $_SESSION['username'] ?? null;

    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;

    $old_cat = $old['category_id'] ?? null;
    $new_cat = $new['category_id'] ?? null;

    $old_name = $old['name'] ?? null;
    $new_name = $new['name'] ?? null;

    $old_ps = $old['price_string'] ?? null;
    $new_ps = $new['price_string'] ?? null;

    $old_pn = isset($old['price_numeric']) ? (float)$old['price_numeric'] : null;
    $new_pn = isset($new['price_numeric']) ? (float)$new['price_numeric'] : null;

    $stmt = $conn->prepare("
        INSERT INTO service_change_log
        (user_id, username, action, service_id,
         category_id_old, category_id_new,
         name_old, name_new,
         price_string_old, price_string_new,
         price_numeric_old, price_numeric_new,
         ip, user_agent)
        VALUES (?, ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?)
    ");

    // types: i s s i i i s s s s d d s s
    $stmt->bind_param(
        "issiiissssddss",
        $user_id, $username, $action, $service_id,
        $old_cat, $new_cat,
        $old_name, $new_name,
        $old_ps, $new_ps,
        $old_pn, $new_pn,
        $ip, $ua
    );
    $stmt->execute();
    $stmt->close();
}

/* ===== ОНОВЛЕННЯ КОРИСТУВАЧА ===== */
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

            if ($update_stmt->execute()) {
                $message = "✅ Дані користувача успішно оновлено.";
            } else {
                $error = "❌ Помилка при оновленні: " . $conn->error;
            }
            $update_stmt->close();
        }
    }
    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ===== ВИДАЛЕННЯ КОРИСТУВАЧА ===== */
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
            if (strtolower($_SESSION['role']) === 'admin' || strtolower($_SESSION['role']) === 'creator') {
                $can_delete = true;
            }
        }

        if ($can_delete) {
            $del_sql = "DELETE FROM users WHERE id = ?";
            $del_stmt = $conn->prepare($del_sql);
            $del_stmt->bind_param("i", $delete_id);
            if ($del_stmt->execute()) {
                $message = "✅ Користувача успішно видалено.";
            } else {
                $error = "❌ Помилка при видаленні користувача: " . $conn->error;
            }
            $del_stmt->close();
        } else {
            $error = "Недостатньо прав для видалення цього користувача.";
        }
    }
    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ===== AJAX: ОТРИМАТИ ДАНІ КОРИСТУВАЧА ===== */
if (isset($_POST['get_user_data'])) {
    header('Content-Type: application/json');
    $user_id = (int)$_POST['get_user_data'];

    $can_view = false;

    if (strtolower($_SESSION['role']) === 'admin' || strtolower($_SESSION['role']) === 'creator') {
        $can_view = true;
    }

    if ($can_view) {
        $stmt = $conn->prepare("SELECT id, username, email, permissions, role FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result_user = $stmt->get_result();
        $user_data = $result_user->fetch_assoc();
        $stmt->close();
        echo json_encode($user_data);
    } else {
        echo json_encode(['error' => 'Недостатньо прав для перегляду цих даних.']);
    }
    exit;
}

/* ===== AJAX: ЗАВАНТАЖЕННЯ ПРАЙС-РЕДАКТОРА ===== */
if (isset($_POST['load_pricing_editor'])) {
    if (!can_access('pricing')) {
        echo "<p>Недостатньо прав для перегляду прайсу.</p>";
        exit;
    }

    $categories = $conn->query("SELECT * FROM servicecategories ORDER BY title");
    $services_grouped = [];

    $services = $conn->query("SELECT * FROM services ORDER BY name");
    while($s = $services->fetch_assoc()) {
        $services_grouped[$s['category_id']][] = $s;
    }

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
        } else {
            $html .= '<p class="empty-service-list">У цій категорії немає послуг.</p>';
        }
        $html .= '</div>';
        $html .= '</div>';
    }

    echo $html;
    exit;
}

/* ===== AJAX: ОТРИМАТИ ДАНІ 1 ПОСЛУГИ ===== */
if (isset($_POST['get_service_data'])) {
    header('Content-Type: application/json');
    if (!can_access('pricing')) {
        echo json_encode(['error' => 'Недостатньо прав.']);
        exit;
    }

    $service_id = (int)$_POST['get_service_data'];
    $stmt = $conn->prepare("SELECT s.*, c.title as category_title FROM services s
                           JOIN servicecategories c ON s.category_id = c.category_id
                           WHERE s.service_id = ?");
    $stmt->bind_param("i", $service_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    $stmt->close();

    if ($data) {
        echo json_encode($data);
    } else {
        echo json_encode(['error' => 'Послугу не знайдено.']);
    }
    exit;
}

/* ===== ДОДАТИ НОВУ ПОСЛУГУ ===== */
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST['add_service'])) {
    if (!can_access('pricing')) {
        $error = "Недостатньо прав для додавання послуги.";
        header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
        exit();
    }

    $category_id = (int)($_POST['category_id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $price_string = trim($_POST['price_string'] ?? '');
    $price_numeric = (float)($_POST['price_numeric'] ?? 0);

    if ($category_id <= 0 || $name === '' || $price_string === '') {
        $error = "❌ Заповни категорію, назву і ціну.";
        header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
        exit();
    }

    $chk = $conn->prepare("SELECT category_id FROM servicecategories WHERE category_id = ?");
    $chk->bind_param("i", $category_id);
    $chk->execute();
    $chk->store_result();
    if ($chk->num_rows === 0) {
        $chk->close();
        $error = "❌ Такої категорії не існує.";
        header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
        exit();
    }
    $chk->close();

    $stmt = $conn->prepare("INSERT INTO services (category_id, name, price_string, price_numeric) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("issd", $category_id, $name, $price_string, $price_numeric);

    if ($stmt->execute()) {
        $new_service_id = $conn->insert_id;

        log_service_change($conn, 'ADD', $new_service_id, null, [
            'category_id' => $category_id,
            'name' => $name,
            'price_string' => $price_string,
            'price_numeric' => $price_numeric
        ]);

        $message = "✅ Послугу додано.";
    } else {
        $error = "❌ Помилка додавання: " . $conn->error;
    }
    $stmt->close();

    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ===== ОНОВЛЕННЯ ПОСЛУГИ ===== */
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST['update_service'])) {
    if (!can_access('pricing')) {
        $error = "Недостатньо прав для оновлення.";
    } else {
        $service_id = (int)$_POST['service_id'];
        $name = trim($_POST['name']);
        $price_string = trim($_POST['price_string']);
        $price_numeric = (float)$_POST['price_numeric'];

        if (empty($name) || empty($price_string)) {
            $error = "❌ Назва та ціна не можуть бути порожніми.";
        } else {
            // old values for log
            $oldStmt = $conn->prepare("SELECT category_id, name, price_string, price_numeric FROM services WHERE service_id = ?");
            $oldStmt->bind_param("i", $service_id);
            $oldStmt->execute();
            $oldData = $oldStmt->get_result()->fetch_assoc();
            $oldStmt->close();

            $stmt = $conn->prepare("UPDATE services SET name = ?, price_string = ?, price_numeric = ? WHERE service_id = ?");
            $stmt->bind_param("ssdi", $name, $price_string, $price_numeric, $service_id);

            if ($stmt->execute()) {
                $message = "✅ Послугу успішно оновлено.";

                if ($oldData) {
                    log_service_change($conn, 'UPDATE', $service_id, $oldData, [
                        'category_id' => $oldData['category_id'],
                        'name' => $name,
                        'price_string' => $price_string,
                        'price_numeric' => $price_numeric
                    ]);
                }
            } else {
                $error = "❌ Помилка: " . $conn->error;
            }
            $stmt->close();
        }
    }
    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ===== ВИДАЛЕННЯ ПОСЛУГИ ===== */
if (isset($_GET['delete_service_id'])) {
    if (!can_access('pricing')) {
        $error = "Недостатньо прав для видалення.";
    } else {
        $delete_id = (int)$_GET['delete_service_id'];

        // old values for log
        $oldStmt = $conn->prepare("SELECT category_id, name, price_string, price_numeric FROM services WHERE service_id = ?");
        $oldStmt->bind_param("i", $delete_id);
        $oldStmt->execute();
        $oldData = $oldStmt->get_result()->fetch_assoc();
        $oldStmt->close();

        $stmt = $conn->prepare("DELETE FROM services WHERE service_id = ?");
        $stmt->bind_param("i", $delete_id);
        if ($stmt->execute()) {
            $message = "✅ Послугу успішно видалено.";

            if ($oldData) {
                log_service_change($conn, 'DELETE', $delete_id, $oldData, null);
            }
        } else {
            $error = "❌ Помилка: " . $conn->error;
        }
        $stmt->close();
    }
    header("Location: creatortool.php?message=" . urlencode($message) . "&error=" . urlencode($error));
    exit();
}

/* ===== AJAX: ЗАВАНТАЖЕННЯ ІСТОРІЇ ЗМІН ===== */
if (isset($_POST['load_history'])) {
    if (!can_access('history')) {
        echo "<p>Недостатньо прав для перегляду історії.</p>";
        exit;
    }

    $limit = 200;
    $q = $conn->query("
        SELECT id, user_id, username, action, service_id,
               name_old, name_new, price_string_old, price_string_new,
               price_numeric_old, price_numeric_new,
               category_id_old, category_id_new,
               ip, created_at
        FROM service_change_log
        ORDER BY created_at DESC
        LIMIT $limit
    ");

    $html = '<div style="overflow:auto; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">';
    $html .= '<table style="width:100%; border-collapse:collapse; min-width:900px;">';
    $html .= '<thead><tr style="background:#f9f9f9;">
        <th style="padding:10px; border-bottom:1px solid #eee; text-align:left;">Дата</th>
        <th style="padding:10px; border-bottom:1px solid #eee; text-align:left;">Хто</th>
        <th style="padding:10px; border-bottom:1px solid #eee; text-align:left;">Дія</th>
        <th style="padding:10px; border-bottom:1px solid #eee; text-align:left;">Service ID</th>
        <th style="padding:10px; border-bottom:1px solid #eee; text-align:left;">Було</th>
        <th style="padding:10px; border-bottom:1px solid #eee; text-align:left;">Стало</th>
        <th style="padding:10px; border-bottom:1px solid #eee; text-align:left;">IP</th>
    </tr></thead><tbody>';

    if ($q) {
        while ($row = $q->fetch_assoc()) {
            $who = htmlspecialchars($row['username'] ?? ('user_id=' . $row['user_id']));
            $action = htmlspecialchars($row['action']);
            $sid = (int)$row['service_id'];

            $wasParts = [];
            if ($row['name_old'] !== null) $wasParts[] = $row['name_old'];
            if ($row['price_string_old'] !== null) $wasParts[] = $row['price_string_old'] . " грн";
            if ($row['price_numeric_old'] !== null) $wasParts[] = "num=" . $row['price_numeric_old'];

            $nowParts = [];
            if ($row['name_new'] !== null) $nowParts[] = $row['name_new'];
            if ($row['price_string_new'] !== null) $nowParts[] = $row['price_string_new'] . " грн";
            if ($row['price_numeric_new'] !== null) $nowParts[] = "num=" . $row['price_numeric_new'];

            $was = htmlspecialchars(implode(" | ", $wasParts));
            $now = htmlspecialchars(implode(" | ", $nowParts));

            $html .= "<tr>
                <td style='padding:10px; border-bottom:1px solid #f0f0f0; white-space:nowrap;'>" . htmlspecialchars(date("d.m.Y H:i", strtotime($row['created_at']))) . "</td>
                <td style='padding:10px; border-bottom:1px solid #f0f0f0;'>" . $who . "</td>
                <td style='padding:10px; border-bottom:1px solid #f0f0f0; font-weight:700;'>" . $action . "</td>
                <td style='padding:10px; border-bottom:1px solid #f0f0f0;'>ID: " . $sid . "</td>
                <td style='padding:10px; border-bottom:1px solid #f0f0f0; color:#555;'>" . $was . "</td>
                <td style='padding:10px; border-bottom:1px solid #f0f0f0; color:#155724;'>" . $now . "</td>
                <td style='padding:10px; border-bottom:1px solid #f0f0f0; white-space:nowrap;'>" . htmlspecialchars($row['ip'] ?? '') . "</td>
            </tr>";
        }
    }

    $html .= '</tbody></table></div>';
    echo $html;
    exit;
}

/* ===== Вибір вкладки за замовчуванням ===== */
$default_tab = 'dashboard';
$tabs = ['all', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'archive', 'call', 'comments', 'pricing', 'history'];
foreach ($tabs as $t) {
    if (can_access($t)) {
        $default_tab = $t;
        break;
    }
}
if (can_access('dashboard') && $default_tab === '') {
    $default_tab = 'dashboard';
}

/* ===== Додавання запису ===== */
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
    while ($r = $result_times->fetch_assoc()) {
        $busy[] = $r['record_time'];
    }
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

        if ($stmt->execute()) {
            $conn->query("DELETE FROM records WHERE id=$id");
            echo "ok";
        } else {
            echo "Error: ".$conn->error;
        }
        $stmt->close();
    } else {
        echo "Record not found";
    }
    exit;
}

/* ===== Відновлення з архіву ===== */
if (isset($_POST['restore'])) {
    $id = intval($_POST['restore']);
    $r_res = $conn->query("SELECT * FROM archive WHERE id=$id");
    if (!$r_res || $r_res->num_rows === 0) {
        echo "Error: record not found";
        exit;
    }
    $r = $r_res->fetch_assoc();

    $service_parts = explode(' → ', $r['service'], 2);
    $category = $service_parts[0] ?? '';
    $service_name = $service_parts[1] ?? '';

    $datetime_parts = explode(' ', $r['datetime'], 2);
    $record_date = $datetime_parts[0] ?? '';
    $record_time = substr($datetime_parts[1] ?? '00:00', 0, 5);

    $stmt_insert = $conn->prepare("INSERT INTO records (client_name, phone, category, service_name, record_date, record_time) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt_insert->bind_param("ssssss", $r['name'], $r['phone'], $category, $service_name, $record_date, $record_time);

    if ($stmt_insert->execute()) {
        $conn->query("DELETE FROM archive WHERE id=$id");
        echo "ok";
    } else {
        echo "Restore error: " . $conn->error;
    }
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

/* ===== Оновлення last_activity ===== */
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
    
    #addServiceBtn{
    display: inline-flex;
    align-items: center;
    gap: 10px;

    padding: 12px 20px;

    background: linear-gradient(135deg, #7c5fe0, #5b45c6);
    color: #fff;

    border: none;
    border-radius: 10px;

    font-size: 14px;
    font-weight: 600;
    font-family: 'Open Sans', sans-serif;

    cursor: pointer;
    transition: all .25s ease;

    box-shadow: 0 4px 12px rgba(124,95,224,.25);
}

#addServiceBtn:hover{
    background: linear-gradient(135deg, #6b52d6, #4a38b4);
    transform: translateY(-1px);
}

#addServiceBtn:active{
    transform: scale(.98);
}

    /* ===== базові елементи (в тебе були) ===== */
    .user-item { cursor: pointer; padding: 8px; border-radius: 4px; transition: background-color 0.2s; }
    .user-item:hover { background-color: #f0f0f0; }

    .modal-overlay {
        display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%;
        overflow: auto; background-color: rgba(0,0,0,0.4); justify-content: center; align-items: center;
    }
    .modal-overlay.visible { display: flex; }

    .modal-box {
        background-color: #fefefe; padding: 20px; border-radius: 8px; max-width: 450px;
        width: 90%; box-shadow: 0 5px 15px rgba(0,0,0,0.3); position: relative;
    }
    .modal-box label, .modal-box input, .modal-box select, .modal-box textarea {
        display: block; width: 100%; margin-top: 10px;
    }
    .modal-box input[type="text"], .modal-box input[type="email"], .modal-box input[type="number"], .modal-box select, .modal-box textarea {
        padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;
    }
    .modal-box button { margin-top: 20px; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
    .modal-box .delete-btn { background-color: #dc3545; color: white; border: none; float: right; }

    .message, .error { padding: 10px; margin-bottom: 10px; border-radius: 4px; }
    .message { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

    /* ===== прайс (в тебе було) ===== */
    #pricingSection { padding: 20px; }
    .pricing-category-group {
        margin-bottom: 25px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        overflow: hidden;
    }
    .pricing-category-group h3 {
        background: #f9f9f9;
        padding: 15px 20px;
        margin: 0;
        border-bottom: 1px solid #eee;
        font-family: 'Prata', serif;
    }
    .service-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 10px;
        padding: 20px;
    }
    .service-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 15px;
        border: 1px solid #eee;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: #fff;
    }
    .service-item:hover {
        background: #f7f5ff;
        border-color: #7c5fe0;
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    .service-item .service-name { font-weight: 600; color: #333; }
    .service-item .service-price { font-weight: 700; color: #7c5fe0; }
    .empty-service-list { padding: 0 20px 10px; color: #888; font-style: italic; }

    /* ==========================================================
       ✅ ЗМІНИ: FIXED SIDEBAR + СКРОЛ В МЕНЮ + ВИЙТИ ВНИЗУ
       ========================================================== */

    /* ширина сайдбару (має збігатися з main margin-left) */
    :root { --sidebar-w: 280px; }

    /* сама панель зафіксована */
    .sidebar{
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: var(--sidebar-w);
        z-index: 999;
        display: flex;
        flex-direction: column;
        overflow: hidden; /* щоб скрол був у меню, а не в whole sidebar */
    }

    /* верхній блок (лого + меню) */
    .sidebar > div{
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
    }

    /* меню скролиться якщо кнопок багато */
    .sidebar .menu{
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding-bottom: 12px;
    }

    /* кнопка вийти завжди знизу */
    .sidebar .logout-btn{
        margin-top: auto;
        position: sticky;
        bottom: 0;
        width: 100%;
    }

    /* контент справа */
    .main{
        margin-left: var(--sidebar-w);
        min-height: 100vh;
    }

    /* щоб мобільна кнопка меню не перекривалась */
    #mobileMenuBtn{
        position: fixed;
        z-index: 1200;
    }

    /* мобільна поведінка (виїжджає) */
    @media (max-width: 768px){
        .main{ margin-left: 0; }

        .sidebar{
            transform: translateX(-110%);
            transition: transform .25s ease;
        }
        .sidebar.active{
            transform: translateX(0);
        }
    }
    /* ==========================================================
   FIX MOBILE MENU IN CREATOR TOOLS:
   backdrop/cart overlay must NOT cover navbar / nav dropdown
   ========================================================== */

/* 1) Navbar завжди вище за оверлеї */
.ftco_navbar{
  position: relative;
  z-index: 1060;
}

/* 2) Backdrop нижче за меню (але вище за сторінку) */
#backdrop{
  z-index: 1040 !important;
}

/* 3) Drawer кошика вище backdrop, але нижче navbar (щоб меню клікабельне) */
.cart-drawer{
  z-index: 1050 !important;
}

/* 4) На мобілці bootstrap collapse-меню теж піднімаємо вище */
@media (max-width: 991px){
  .ftco_navbar{
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1060 !important;
  }

  /* якщо є body padding-top — прибери, бо меню має бути з самого верху */
  body{ padding-top: 0 !important; }

  /* щоб контент не ліз під fixed navbar */
  .ftco-section,
  .hero-wrap{
    padding-top: 80px;
  }

  /* важливо: саме меню (випадаюче) має бути над усім */
  #ftco-nav,
  .navbar-collapse{
    position: relative;
    z-index: 1061 !important;
  }
}
/* =======================
   FIX MOBILE SIDEBAR CLICKS
   ======================= */

/* кнопка бургер — завжди поверх */
#mobileMenuBtn{
  top: 14px;
  left: 14px;
  z-index: 2200 !important;
}

/* сайдбар поверх оверлея і сторінки */
.sidebar{
  z-index: 2100 !important;
}

/* ОВЕРЛЕЙ: за замовчуванням НЕ має ловити кліки */
#mobileOverlay{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;          /* ключове */
  transition: opacity .25s ease, visibility .25s ease;
  z-index: 2000 !important;      /* нижче sidebar, вище main */
}

/* коли активний — ловить кліки */
#mobileOverlay.active{
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

/* на мобілці зробимо ширину норм і щоб не було “криво” */
@media (max-width: 768px){
  .sidebar{
    width: min(86vw, 320px);
    max-width: 320px;
  }
}

/* коли меню відкрите — блокуємо скрол сторінки під ним */
body.menu-open{
  overflow: hidden;
  touch-action: none;
}

</style>

</head>
<body>
<button id="mobileMenuBtn" class="mobile-menu-toggle">
    <i class="fas fa-bars"></i>
</button>
<div id="mobileOverlay"></div>

<div class="sidebar">
    <div>
        <a class="navbar-brand" style="display:flex; align-items:center; text-decoration:none; margin-bottom: 20px;">
            <!-- FIX: правильний шлях до іконки -->
            <img src="/images/logopnd.png" alt="Beauty Room" style="height:70px; margin-right:10px;">
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

    <?php if (!empty($message)): ?>
        <div class="message"><?php echo $message; ?></div>
    <?php endif; ?>
    <?php if (!empty($error)): ?>
        <div class="error"><?php echo $error; ?></div>
    <?php endif; ?>

    <div id="dashboardSection" style="display: none;">
        <h2><i class="fas fa-chart-line"></i> Дашборд</h2>
        <div class="widget-grid">
            <div class="stat-card calendar-widget">
                <h3><i class="fas fa-calendar-alt"></i> Календар</h3>
                <div id="calendar-content">
                    <div class="calendar-header">
                        <button id="prevMonth">←</button>
                        <span id="monthYear"></span>
                        <button id="nextMonth">→</button>
                    </div>
                    <div class="calendar-days"></div>
                </div>
            </div>

            <div class="stat-card combined-stats-widget">
                <div class="clock-display-wrapper">
                    <h3><i class="fas fa-clock"></i> Поточний час</h3>
                    <div id="current-time-display" class="time-display">
                        <span id="current-hour">00</span>:<span id="current-minute">00</span>
                    </div>
                    <div id="current-date-display" class="date-display">
                        Пт, 01 Січня 2025
                    </div>
                </div>

                <div class="stats-list-wrapper">
                    <h3><i class="fas fa-chart-pie"></i> Актуальна статистика</h3>
                    <div class="stat-item">
                        <span><i class="fas fa-calendar-check"></i> Усі записи:</span>
                        <strong><?= $result ? $result->num_rows : 0 ?></strong>
                    </div>
                    <div class="stat-item">
                        <span><i class="fas fa-box-open"></i> У архіві:</span>
                        <strong><?= $archive ? $archive->num_rows : 0 ?></strong>
                    </div>
                    <div class="stat-item">
                        <span><i class="fas fa-bell"></i> Заявки на дзвінок:</span>
                        <strong><?= $appointments ? $appointments->num_rows : 0 ?></strong>
                    </div>
                    <div class="stat-item">
                        <span><i class="fas fa-heart"></i> Коментарі:</span>
                        <strong><?= $comments ? $comments->num_rows : 0 ?></strong>
                    </div>
                </div>
            </div>

            <div class="stat-card active-users-widget">
                <h3><i class="fas fa-users"></i> Активні користувачі</h3>
                <div class="user-list">
                    <?php if ($users_result && $users_result->num_rows > 0):
                        $users_result->data_seek(0);
                        while($user = $users_result->fetch_assoc()):
                            $online = is_online($user['last_activity']);
                            $status_class = $online ? 'online' : 'offline';
                            $status_text = $online ? 'В мережі' : 'Офлайн';
                            $can_edit = (strtolower($_SESSION['role']) === 'admin' || strtolower($_SESSION['role']) === 'creator');
                    ?>
                        <div class="user-item" data-user-id="<?= $user['id'] ?>" style="<?= $can_edit ? 'cursor: pointer;' : '' ?>">
                            <span class="username"><?= htmlspecialchars($user['username']) ?></span>
                            <span class="user-role"><?= htmlspecialchars($user['role']) ?></span>
                            <div class="user-status">
                                <i class="fas fa-circle <?= $status_class ?>"></i>
                                <span class="<?= $status_class ?>-text"><?= $status_text ?></span>
                            </div>
                            <small class="last-activity">
                                <?php if (!$online): ?>
                                    (<?= date("d.m H:i", strtotime($user['last_activity'])) ?>)
                                <?php endif; ?>
                            </small>
                        </div>
                    <?php endwhile; else: ?>
                        <p>Користувачів не знайдено.</p>
                    <?php endif; ?>
                </div>
            </div>

        </div>
    </div>

    <div id="pricingSection" style="display: none;">
        <h2><i class="fas fa-tags"></i> Редактор Прайсу</h2>
        <p style="padding: 0 20px 10px; color: #555;">Оберіть послугу, щоб відредагувати її назву або ціну.</p>

        <div style="padding: 0 20px 15px; display:flex; gap:10px; align-items:center;">
            <button type="button" id="addServiceBtn" class="main-add-btn" style="width:auto;">
                <i class="fas fa-plus"></i> Додати послугу
            </button>
        </div>

        <div id="pricing-editor-content">
            <p style="text-align: center; padding: 20px;">Завантаження прайсу...</p>
        </div>
    </div>

    <div id="historySection" style="display: none; padding:20px;">
        <h2><i class="fas fa-clock-rotate-left"></i> Історія змін</h2>
        <p style="color:#555;">Тут показані всі додавання / редагування / видалення послуг.</p>
        <div id="history-content">
            <p style="text-align:center; padding:20px;">Завантаження...</p>
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

    <div id="recordsList" style="display: none;">
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
                <?= htmlspecialchars($row['category']) ?> &rarr; <?= htmlspecialchars($row['service_name']) ?><br>
                <small><i class="far fa-clock"></i> <?= htmlspecialchars($row['record_time']) ?></small>
                <?php if (!empty($row['note'])): ?>
                    <div class="note-display" style="font-style: italic; color: #777; margin-top: 5px;">
                        <i class="far fa-sticky-note"></i> <?= htmlspecialchars($row['note']) ?>
                    </div>
                <?php endif; ?>
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
                <button class="action-btn" onclick="restore(<?= $row['id'] ?>)" title="Відновити з архіву"><i class="fas fa-undo-alt"></i></button>
                <button class="action-btn danger" onclick="deleteRecord(<?= $row['id'] ?>, event)" title="Видалити назавжди"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
        <?php endwhile; else: echo "<p>Архів порожній.</p>"; endif; ?>
    </div>

    <div id="callSection" style="display:none;">
        <h2><i class="fas fa-phone-alt"></i> Перетелефонувати</h2>
        <div class="cards">
        <?php if($appointments && $appointments->num_rows > 0): $appointments->data_seek(0); while($row = $appointments->fetch_assoc()): ?>
            <div class="card" id="appointment-<?= $row['id'] ?>">
                <button class="action-btn danger" onclick="deleteAppointment(<?= $row['id'] ?>)" title="Видалити запит"><i class="fas fa-times"></i></button>
                <h3><?= htmlspecialchars($row['name']) ?></h3>
                <p><b>Телефон:</b> <?= htmlspecialchars($row['phone']) ?></p>
                <p><b>Послуга:</b> <?= htmlspecialchars($row['service']) ?></p>
                <p class="comment-description" style="font-style: italic;">“<?= htmlspecialchars($row['message']) ?>”</p>
                <small>Створено: <?= htmlspecialchars(date("d.m.Y H:i", strtotime($row['created_at']))) ?></small>
            </div>
        <?php endwhile; else: echo "<p>Немає запитів для передзвону.</p>"; endif; ?>
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

<div id="recordModal" class="modal-overlay">
    <div class="modal-box">
        <h2 id="modalTitle">Новий запис</h2>
        <form id="addRecordForm" method="post">
            <input type="hidden" id="recordCategory" name="category" value="">
            <label for="service_name_select">Послуга:</label>
            <select name="service_name" id="service_name_select" required>
                <option value="">-- Спочатку оберіть категорію --</option>
            </select>
            <label for="record_date">Дата та час:</label>
            <div style="display: flex; gap: 10px;">
                <input type="date" name="record_date" id="record_date" required style="flex: 1;">
                <select name="record_time" id="record_time" required style="flex: 1;">
                    <option value="">Час</option>
                    <option value="09:30">09:30</option><option value="10:30">10:30</option><option value="11:30">11:30</option>
                    <option value="12:30">12:30</option><option value="13:30">13:30</option><option value="14:30">14:30</option>
                    <option value="15:30">15:30</option><option value="16:30">16:30</option><option value="17:30">17:30</option>
                    <option value="18:30">18:30</option>
                </select>
            </div>
            <label for="client_name_input">Інформація про клієнта:</label>
            <input type="text" name="client_name" id="client_name_input" placeholder="Ім’я клієнта" required>
            <input type="tel" name="phone" placeholder="Телефон" required>
            <button type="submit" name="add_record">Зберегти запис</button>
        </form>
    </div>
</div>

<div id="userEditModal" class="modal-overlay">
    <div class="modal-box">
        <h2 id="editUserTitle">Редагування користувача</h2>
        <form id="editUserForm" method="POST">
            <input type="hidden" name="update_user" value="1">
            <input type="hidden" name="user_id" id="edit_user_id">

            <label for="edit_username">Ім'я користувача:</label>
            <input type="text" id="edit_username" name="username" disabled style="background-color: #eee;">

            <label for="edit_email">Email:</label>
            <input type="email" id="edit_email" name="email" disabled style="background-color: #eee;">

            <label>Доступи (Permissions):</label>
            <div class="permission-grid">
                <div>
                    <input type="checkbox" name="permissions[]" value="all" id="perm-all" class="permission-checkbox">
                    <label for="perm-all">👑 Повний доступ (all)</label>
                </div>
                <div>
                    <input type="checkbox" name="permissions[]" value="Масаж" id="perm-Масаж" class="permission-checkbox">
                    <label for="perm-Масаж">Масаж</label>
                </div>
                <div>
                    <input type="checkbox" name="permissions[]" value="Elos-епіляція" id="perm-Elos-епіляція" class="permission-checkbox">
                    <label for="perm-Elos-епіляція">Elos-епіляція</label>
                </div>
                <div>
                    <input type="checkbox" name="permissions[]" value="Доглядові процедури" id="perm-Доглядові процедури" class="permission-checkbox">
                    <label for="perm-Доглядові процедури">Доглядові процедури</label>
                </div>
                <div>
                    <input type="checkbox" name="permissions[]" value="archive" id="perm-archive" class="permission-checkbox">
                    <label for="perm-archive">Архів</label>
                </div>
                <div>
                    <input type="checkbox" name="permissions[]" value="call" id="perm-call" class="permission-checkbox">
                    <label for="perm-call">Перетелефонувати</label>
                </div>
                <div>
                    <input type="checkbox" name="permissions[]" value="comments" id="perm-comments" class="permission-checkbox">
                    <label for="perm-comments">Коментарі</label>
                </div>
                <div>
                    <input type="checkbox" name="permissions[]" value="pricing" id="perm-pricing" class="permission-checkbox">
                    <label for="perm-pricing">Редактор Прайсу</label>
                </div>
                <div>
                    <input type="checkbox" name="permissions[]" value="history" id="perm-history" class="permission-checkbox">
                    <label for="perm-history">Історія змін</label>
                </div>
            </div>

            <?php if (strtolower($_SESSION['role']) === 'admin' || strtolower($_SESSION['role']) === 'creator'): ?>
                <label for="edit_role">Роль:</label>
                <select id="edit_role" name="role">
                    <option value="user">User</option>
                    <option value="creator">Creator</option>
                    <option value="admin">Admin</option>
                </select>
            <?php else: ?>
                <input type="hidden" name="role" id="edit_role_hidden">
            <?php endif; ?>

            <button type="submit" class="main-add-btn">💾 Зберегти зміни</button>
            <button type="button" class="delete-btn" id="deleteUserBtn">❌ Видалити</button>
        </form>
    </div>
</div>

<div id="serviceEditModal" class="modal-overlay">
    <div class="modal-box">
        <h2>Редагувати Послугу</h2>
        <form id="editServiceForm" method="POST">
            <input type="hidden" name="update_service" value="1">
            <input type="hidden" id="edit_service_id" name="service_id">

            <label for="edit_service_category">Категорія:</label>
            <input type="text" id="edit_service_category" disabled style="background-color: #eee;">

            <label for="edit_service_name">Назва Послуги:</label>
            <input type="text" id="edit_service_name" name="name" required>

            <label for="edit_service_price_string">Ціна (текст, напр. "500 / 700"):</label>
            <input type="text" id="edit_service_price_string" name="price_string" required>

            <label for="edit_service_price_numeric">Ціна (число, для кошика):</label>
            <input type="number" id="edit_service_price_numeric" name="price_numeric" required step="0.01" min="0">
            <small style="display: block; margin-top: 5px; color: #666;">Це число використовується для підрахунку суми в кошику.</small>

            <button type="submit" class="main-add-btn">💾 Зберегти зміни</button>
            <button type="button" class="delete-btn" id="deleteServiceBtn">❌ Видалити Послугу</button>
        </form>
    </div>
</div>

<!-- МОДАЛКА: ДОДАТИ ПОСЛУГУ -->
<div id="serviceAddModal" class="modal-overlay">
    <div class="modal-box">
        <h2>Додати Послугу</h2>
        <form method="POST" id="addServiceForm">
            <input type="hidden" name="add_service" value="1">

            <label for="add_service_category">Категорія:</label>
            <select id="add_service_category" name="category_id" required>
                <option value="">-- Оберіть категорію --</option>
                <?php
                    $cats = $conn->query("SELECT category_id, title FROM servicecategories ORDER BY title");
                    if ($cats) {
                        while($c = $cats->fetch_assoc()){
                            echo '<option value="'.(int)$c['category_id'].'">'.htmlspecialchars($c['title']).'</option>';
                        }
                    }
                ?>
            </select>

            <label for="add_service_name">Назва Послуги:</label>
            <input type="text" id="add_service_name" name="name" required>

            <label for="add_service_price_string">Ціна (текст):</label>
            <input type="text" id="add_service_price_string" name="price_string" required>

            <label for="add_service_price_numeric">Ціна (число):</label>
            <input type="number" id="add_service_price_numeric" name="price_numeric" required step="0.01" min="0">

            <button type="submit" class="main-add-btn">✅ Додати</button>
            <button type="button" class="delete-btn" id="closeAddServiceModal">Закрити</button>
        </form>
    </div>
</div>

<script>
/* ===== Мобільне меню ===== */
const mobileBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('mobileOverlay');

if (mobileBtn) {
    mobileBtn.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');

        const icon = this.querySelector('i');
        if (sidebar.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}

if (overlay) {
    overlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        if(mobileBtn) {
            mobileBtn.querySelector('i').classList.remove('fa-times');
            mobileBtn.querySelector('i').classList.add('fa-bars');
        }
    });
}

document.querySelectorAll('.sidebar .menu button').forEach(btn => {
    btn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            if(mobileBtn) {
                mobileBtn.querySelector('i').classList.remove('fa-times');
                mobileBtn.querySelector('i').classList.add('fa-bars');
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const servicesData = {
        'Масаж': ['Загальний масаж тіла', 'Масаж спини', 'Антицелюлітний масаж', 'Лімфодренажний масаж'],
        'Elos-епіляція': ['Ноги повністю', 'Руки повністю', 'Глибоке бікіні', 'Пахви', 'Верхня губа'],
        'Доглядові процедури': ['Чистка обличчя', 'Пілінг', 'Карбоксітерапія', 'Маска для обличчя']
    };

    const addRecordBtn = document.getElementById('addRecordBtn');
    const addRecordDropdown = document.getElementById('addRecordDropdown');
    const recordModal = document.getElementById("recordModal");
    const modalTitle = document.getElementById('modalTitle');
    const serviceSelect = document.getElementById('service_name_select');
    const categoryInput = document.getElementById('recordCategory');
    const addRecordForm = document.getElementById('addRecordForm');

    const hourDisplay = document.getElementById('current-hour');
    const minuteDisplay = document.getElementById('current-minute');
    const dateDisplay = document.getElementById('current-date-display');
    const dayNamesFull = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
    const monthNamesFull = ["Січня", "Лютого", "Березня", "Квітня", "Травня", "Червня",
        "Липня", "Серпня", "Вересня", "Жовтня", "Листопада", "Грудня"];

    function updateClock() {
        const now = new Date();
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');

        const dayOfWeek = dayNamesFull[now.getDay()];
        const dayOfMonth = now.getDate();
        const monthName = monthNamesFull[now.getMonth()];
        const year = now.getFullYear();

        if (hourDisplay) hourDisplay.textContent = hour;
        if (minuteDisplay) minuteDisplay.textContent = minute;
        if (dateDisplay) dateDisplay.textContent = `${dayOfWeek}, ${dayOfMonth} ${monthName} ${year}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    const calendarDaysDiv = document.querySelector('.calendar-days');
    const monthYearSpan = document.getElementById('monthYear');
    const today = new Date();
    let currentDisplayDate = new Date();

    function generateCalendar(year, month) {
        if(!calendarDaysDiv) return;
        calendarDaysDiv.innerHTML = '';
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        let startDay = firstDay.getDay();

        const dayNamesShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
        const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
            "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
        if (monthYearSpan) monthYearSpan.textContent = `${monthNames[month]} ${year}`;

        dayNamesShort.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('day', 'day-header');
            dayHeader.textContent = day;
            calendarDaysDiv.appendChild(dayHeader);
        });

        let startDayOfWeek = (startDay === 0) ? 6 : startDay - 1;
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('day', 'empty');
            calendarDaysDiv.appendChild(emptyDay);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('day');
            dayElement.textContent = day;

            if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayElement.classList.add('current-day');
            }

            const dateCheck = new Date(year, month, day);
            if (dateCheck.getDay() === 0 || dateCheck.getDay() === 6) {
                dayElement.classList.add('weekend');
            }

            dayElement.style.cursor = 'pointer';
            dayElement.addEventListener('click', function () {
                window.open(
                    'https://docs.google.com/spreadsheets/d/1J-NKLPMUF_5OgpsDA9X8y19YpHRnYFGLdAvuAz2xRYk/edit?usp=sharing',
                    '_blank'
                );
            });

            calendarDaysDiv.appendChild(dayElement);
        }
    }

    generateCalendar(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth());

    const prevMonthBtn = document.getElementById('prevMonth');
    if(prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
            generateCalendar(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth());
        });
    }

    const nextMonthBtn = document.getElementById('nextMonth');
    if(nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
            generateCalendar(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth());
        });
    }

    if (addRecordBtn) {
        addRecordBtn.onclick = () => addRecordDropdown.classList.toggle('visible');
    }

    if (addRecordDropdown) {
        addRecordDropdown.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                const category = e.target.dataset.category;
                modalTitle.textContent = 'Новий запис: ' + category;
                categoryInput.value = category;
                serviceSelect.innerHTML = '<option value="">Оберіть послугу...</option>';
                if (servicesData[category]) {
                    servicesData[category].forEach(service => {
                        const option = new Option(service, service);
                        serviceSelect.add(option);
                    });
                }
                recordModal.classList.add('visible');
                addRecordDropdown.classList.remove('visible');
            }
        });
    }

    const serviceEditModal = document.getElementById('serviceEditModal');
    const deleteServiceBtn = document.getElementById('deleteServiceBtn');

    /* === ДОДАТИ ПОСЛУГУ: МОДАЛКА === */
    const addServiceBtn = document.getElementById('addServiceBtn');
    const serviceAddModal = document.getElementById('serviceAddModal');
    const closeAddServiceModal = document.getElementById('closeAddServiceModal');

    if (addServiceBtn && serviceAddModal) {
        addServiceBtn.addEventListener('click', () => {
            serviceAddModal.classList.add('visible');
        });
    }
    if (closeAddServiceModal && serviceAddModal) {
        closeAddServiceModal.addEventListener('click', () => {
            serviceAddModal.classList.remove('visible');
        });
    }

    /* === Глобальна функція завантаження прайсу === */
    window.loadPricingEditor = function() {
        const pricingEditorContent = document.getElementById('pricing-editor-content');
        if(!pricingEditorContent) return;

        pricingEditorContent.innerHTML = '<p style="text-align: center; padding: 20px;">Завантаження прайсу...</p>';
        fetch("", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "load_pricing_editor=1"
        })
        .then(r => r.text())
        .then(html => {
            pricingEditorContent.innerHTML = html;
            window.bindPricingEditorEvents();
        })
        .catch(err => {
            console.error(err);
            pricingEditorContent.innerHTML = '<p style="color: red; text-align: center;">Не вдалося завантажити прайс.</p>';
        });
    };

    /* === Глобальна функція відкриття модалки послуги === */
    window.openServiceEditor = function(serviceId) {
        fetch("", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "get_service_data=" + encodeURIComponent(serviceId)
        })
        .then(r => r.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }

            document.getElementById('edit_service_id').value = data.service_id;
            document.getElementById('edit_service_category').value = data.category_title;
            document.getElementById('edit_service_name').value = data.name;
            document.getElementById('edit_service_price_string').value = data.price_string;
            document.getElementById('edit_service_price_numeric').value = data.price_numeric;

            serviceEditModal.classList.add('visible');
        })
        .catch(error => console.error('Error fetching service data:', error));
    };

    /* === Прив’язка кліків по послугах у прайсі === */
    window.bindPricingEditorEvents = function() {
        const pricingEditorContent = document.getElementById('pricing-editor-content');
        if(pricingEditorContent) {
            pricingEditorContent.onclick = function(e) {
                const serviceItem = e.target.closest('.service-item');
                if (serviceItem) {
                    const serviceId = serviceItem.dataset.serviceId;
                    window.openServiceEditor(serviceId);
                }
            };
        }
    };

    if(deleteServiceBtn) {
        deleteServiceBtn.addEventListener('click', function() {
            const serviceId = document.getElementById('edit_service_id').value;
            const serviceName = document.getElementById('edit_service_name').value;
            if (confirm(`Ви впевнені, що хочете видалити послугу "${serviceName}"? Це неможливо буде скасувати.`)) {
                window.location.href = `creatortool.php?delete_service_id=${serviceId}`;
            }
        });
    }

    /* === ІСТОРІЯ: AJAX === */
    window.loadHistory = function() {
        const hc = document.getElementById('history-content');
        if (!hc) return;
        hc.innerHTML = '<p style="text-align:center; padding:20px;">Завантаження...</p>';

        fetch("", {
            method: "POST",
            headers: {"Content-Type":"application/x-www-form-urlencoded"},
            body: "load_history=1"
        })
        .then(r => r.text())
        .then(html => hc.innerHTML = html)
        .catch(() => hc.innerHTML = '<p style="color:red; text-align:center;">Не вдалося завантажити історію.</p>');
    };

    const userEditModal = document.getElementById('userEditModal');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const userRole = '<?php echo strtolower($_SESSION['role']); ?>';
    const currentUserId = '<?php echo $_SESSION['user_id']; ?>';

    document.querySelectorAll('.user-item').forEach(item => {
        item.addEventListener('click', function() {
            const userId = this.dataset.userId;

            fetch("", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: "get_user_data=" + userId
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }

                document.getElementById('edit_user_id').value = data.id;
                document.getElementById('editUserTitle').textContent = `Редагування: ${data.username}`;
                document.getElementById('edit_username').value = data.username;
                document.getElementById('edit_email').value = data.email;

                document.querySelectorAll('#editUserForm .permission-checkbox').forEach(cb => {
                    cb.checked = false;
                });

                const userPerms = (data.permissions || '').split(',');
                userPerms.forEach(perm => {
                    perm = perm.trim();
                    if (perm) {
                        const checkbox = document.getElementById('perm-' + perm);
                        if (checkbox) checkbox.checked = true;
                    }
                });

                const roleSelect = document.getElementById('edit_role');
                if (roleSelect) roleSelect.value = data.role;

                if (userRole === 'admin' || userRole === 'creator') {
                    if(deleteUserBtn) {
                        deleteUserBtn.style.display = (data.id != currentUserId) ? 'inline-block' : 'none';
                    }
                } else {
                    if(deleteUserBtn) deleteUserBtn.style.display = 'none';
                }

                userEditModal.classList.add('visible');
            })
            .catch(error => console.error('Error fetching user data:', error));
        });
    });

    if(deleteUserBtn) {
        deleteUserBtn.addEventListener('click', function() {
            const userId = document.getElementById('edit_user_id').value;
            const username = document.getElementById('edit_username').value;
            if (confirm(`Ви впевнені, що хочете видалити користувача ${username}? Це неможливо буде скасувати.`)) {
                window.location.href = `creatortool.php?delete_id=${userId}`;
            }
        });
    }

    window.addEventListener('click', function(e) {
        if (addRecordBtn && !addRecordBtn.contains(e.target) && addRecordDropdown && !addRecordDropdown.contains(e.target)) {
            addRecordDropdown.classList.remove('visible');
        }
        if (e.target == recordModal) {
            recordModal.classList.remove("visible");
            addRecordForm.reset();
        }
        if (e.target == userEditModal) {
            userEditModal.classList.remove("visible");
        }
        if (e.target == serviceEditModal) {
            serviceEditModal.classList.remove("visible");
        }
        if (serviceAddModal && e.target == serviceAddModal) {
            serviceAddModal.classList.remove("visible");
        }
    });

    const searchInput = document.getElementById("searchInput");
    if(searchInput) {
        searchInput.addEventListener("keyup", function() {
            let filter = this.value.toLowerCase();
            let activeList = document.querySelector('#recordsList');
            if (activeList && window.getComputedStyle(activeList).display !== 'none') {
                activeList.querySelectorAll(".email").forEach(item => {
                    item.style.display = item.innerText.toLowerCase().includes(filter) ? "flex" : "none";
                });
            }
        });
    }

    showSection('<?= $default_tab ?>');
});

/* ==== Глобальна функція перемикання секцій ==== */
function showSection(sec) {
    document.querySelectorAll('.main > div[id$="Section"], .main > div[id$="List"]').forEach(s => s.style.display = 'none');

    const categoryIcons = {
        'Масаж': 'fa-spa',
        'Elos-епіляція': 'fa-star',
        'Доглядові процедури': 'fa-pump-soap',
        'dashboard': 'fa-chart-line',
        'archive': 'fa-archive',
        'call': 'fa-phone-alt',
        'comments': 'fa-comments',
        'all': 'fa-list-ul',
        'pricing': 'fa-tags',
        'history': 'fa-clock-rotate-left'
    };

    const recordsListDiv = document.getElementById('recordsList');
    const listTitle = document.getElementById('recordsListTitle');
    const toolbar = document.querySelector('.toolbar');
    const searchInput = document.getElementById('searchInput');

    if(searchInput) searchInput.value = '';

    if (sec === 'dashboard') {
        document.getElementById('dashboardSection').style.display = 'block';
        if (toolbar) toolbar.style.display = 'none';
    }
    else if (sec === 'pricing') {
        const pricingSection = document.getElementById('pricingSection');
        if (pricingSection) pricingSection.style.display = 'block';
        if (toolbar) toolbar.style.display = 'none';

        const content = document.getElementById('pricing-editor-content');
        if (content && !content.querySelector('.pricing-category-group')) {
            if (window.loadPricingEditor) window.loadPricingEditor();
        }
    }
    else if (sec === 'history') {
        const hs = document.getElementById('historySection');
        if (hs) hs.style.display = 'block';
        if (toolbar) toolbar.style.display = 'none';

        if (window.loadHistory) window.loadHistory();
    }
    else if (sec === 'archive' || sec === 'call' || sec === 'comments') {
        const sectionToShow = document.getElementById(sec + 'Section');
        if (sectionToShow) sectionToShow.style.display = 'block';
        if (toolbar) toolbar.style.display = 'none';
    }
    else {
        if(recordsListDiv) recordsListDiv.style.display = 'block';
        if (toolbar) toolbar.style.display = 'flex';

        const emails = recordsListDiv ? recordsListDiv.querySelectorAll(".email") : [];

        if(listTitle) {
            listTitle.innerHTML = `<i class="fas ${categoryIcons[sec]}"></i> ${sec === 'all' ? 'Усі записи' : sec}`;
        }

        if (sec === 'all') {
            emails.forEach(e => e.style.display = 'flex');
        } else {
            emails.forEach(e => e.style.display = (e.dataset.category === sec) ? 'flex' : 'none');
        }
    }

    document.querySelectorAll('.sidebar .menu button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('btn-' + sec);
    if(activeBtn) activeBtn.classList.add('active');
}

function deleteRecord(id, e) {
    e.stopPropagation();
    if (!confirm("Видалити запис назавжди?")) return;
    fetch("", {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: "delete_id=" + id})
    .then(r => r.text()).then(t => { if (t.trim() === "ok") location.reload(); });
}

function moveToArchive(id, e) {
    e.stopPropagation();
    if (!confirm("Перемістити запис до архіву?")) return;
    fetch("", {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: "move_one=" + id})
    .then(r => r.text()).then(t => { if (t.trim() === "ok") location.reload(); });
}

function restore(id) {
    if (!confirm("Відновити цей запис з архіву?")) return;
    fetch("", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "restore=" + id
    })
    .then(r => r.text()).then(t => {
        if (t.trim() === "ok") {
            location.reload();
        } else {
            alert("Restore error: " + t);
        }
    });
}

function deleteAppointment(id) {
    if (!confirm("Видалити цей запит на дзвінок?")) return;
    fetch("", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "delete_appointment=" + id
    })
    .then(r => r.text()).then(t => {
        if (t.trim() === "ok") {
            const card = document.getElementById("appointment-" + id);
            if (card) {
                card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                card.style.transform = 'scale(0.9)';
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            }
        } else {
            alert("Deletion error: " + t);
        }
    });
}

function deleteComment(id) {
    if (!confirm("Ви впевнені, що хочете видалити цей коментар?")) return;
    fetch("", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "delete_comment=" + id })
    .then(r => r.text()).then(text => {
        if (text.trim() === "ok") {
            const card = document.getElementById("comment-" + id);
            if (card) {
                card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                card.style.transform = 'scale(0.9)';
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
            }
        } else { alert("Error: " + text); }
    });
}
// ==========================================================
// FIX: backdrop/cart must not break mobile navbar clicks
// ==========================================================
$(document).ready(function () {

  // helper: hide cart overlay safely
  function forceHideCartOverlay(){
    const bd = document.getElementById('backdrop');
    const dr = document.getElementById('cartDrawer');

    if (dr) dr.classList.remove('open');
    if (bd) bd.style.display = 'none';
  }

  // 1) Коли відкривають burger-меню — точно прибираємо backdrop кошика
  $('.navbar-toggler').on('click', function(){
    forceHideCartOverlay();
  });

  // 2) Клік по пункту меню — закрити меню (як у тебе вже було)
  $('.navbar-nav>li>a').on('click', function(){
    $('.navbar-collapse').collapse('hide');
  });

  // 3) Додатково: якщо меню (collapse) відкрилось — backdrop ховаємо
  $('.navbar-collapse').on('shown.bs.collapse', function(){
    forceHideCartOverlay();
  });
});

</script>

</body>
</html>
