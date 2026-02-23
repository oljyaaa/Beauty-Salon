<?php

session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// User permissions array
$user_permissions = [];
if (!empty($_SESSION['permissions'])) {
    $user_permissions = array_map('trim', explode(',', $_SESSION['permissions']));
}

// Access check function
function can_access($tab) {
    global $user_permissions;
    if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') {
        return true;
    }
    if ($tab === 'all' && in_array('all', $user_permissions)) {
        return true;
    }
    return in_array($tab, $user_permissions);
}

// Determine the starting tab
$default_tab = '';
$tabs = ['all', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'archive', 'call', 'comments'];
foreach ($tabs as $t) {
    if (can_access($t)) {
        $default_tab = $t;
        break;
    }
}

$servername = "dg602726.mysql.tools";
$username = "dg602726_salon";
$password = "C4cxy5D^+8";
$dbname = "dg602726_salon";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");


// Add record
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

// Get busy times
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

// Get record for editing
if (isset($_POST['get_record'])) {
    $id = intval($_POST['get_record']);
    $stmt = $conn->prepare("SELECT * FROM records WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result_record = $stmt->get_result();
    $r = $result_record->fetch_assoc();
    $stmt->close();
    echo json_encode($r);
    exit;
}

// Update record
if (isset($_POST['update_id'])) {
    $id = intval($_POST['update_id']);
    $client = $_POST['client_name'];
    $phone = $_POST['phone'];
    $service = $_POST['service_name'];
    $note = $_POST['note'];

    $stmt = $conn->prepare("UPDATE records SET client_name=?, phone=?, service_name=?, note=? WHERE id=?");
    $stmt->bind_param("ssssi", $client, $phone, $service, $note, $id);
    $stmt->execute();
    $stmt->close();
    echo "ok";
    exit;
}

// Move one record to archive
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

// Restore from archive
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

// Delete from records or archive
if (isset($_POST['delete_id'])) {
    $id = intval($_POST['delete_id']);
    $conn->query("DELETE FROM records WHERE id=$id");
    $conn->query("DELETE FROM archive WHERE id=$id");
    echo "ok";
    exit;
}

// Delete comment
if (isset($_POST['delete_comment'])) {
    $id = intval($_POST['delete_comment']);
    $stmt = $conn->prepare("DELETE FROM comments WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute() ? print("ok") : print("Error");
    $stmt->close();
    exit;
}

// Delete appointment
if (isset($_POST['delete_appointment'])) {
    $id = intval($_POST['delete_appointment']);
    $stmt = $conn->prepare("DELETE FROM appointments WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $stmt->close();
    echo "ok";
    exit;
}

// Update user activity
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("UPDATE users SET last_activity = NOW() WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->close();
}

// --- DATA FETCHING FOR DISPLAY ---
$result = $conn->query("SELECT * FROM records ORDER BY record_date ASC, record_time ASC");
$archive = $conn->query("SELECT * FROM archive ORDER BY DATE(datetime) ASC, TIME(datetime) ASC");
$appointments = $conn->query("SELECT * FROM appointments ORDER BY created_at DESC");
$comments = $conn->query("SELECT * FROM comments ORDER BY created_at DESC");

?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Beauty Room — Адмін</title>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Prata&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css?v=<?php echo filemtime('assets/css/style.css'); ?>">
</head>
<body>
<button id="mobileMenuBtn" class="mobile-menu-toggle">
    <i class="fas fa-bars"></i>
</button>
<div id="mobileOverlay"></div>
<div class="sidebar">
    <div>
        <a class="navbar-brand" style="display:flex; align-items:center; text-decoration:none; margin-bottom: 20px;">
            <img src="BeautyRoomSite/images/logopnd.png" alt="Beauty Room" style="height:70px; margin-right:10px;">
            <h2 style="margin:0; font-size:20px; color:#fff;">Beauty Room</h2>
        </a>
        <div class="menu">
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

            <?php if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin'): ?>
                <button onclick="window.location.href='register.php'" class="admin-action-btn">
                    <i class="fas fa-user-plus"></i> Створити акаунт</button>
            <?php endif; ?>
            </div> </div>
    <button class="logout-btn" onclick="window.location.href='logout.php'"><i class="fas fa-sign-out-alt"></i> Вийти</button>
</div>
        </div>
    </div>


<div class="main">
    <p class="welcome-message">
        Вітаємо, <strong><?php echo htmlspecialchars($_SESSION['username']); ?></strong> 
        (Ваша роль: <span class="user-role-animated"><?php echo htmlspecialchars($_SESSION['role']); ?></span>)
    </p>
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
            $currentDate = '';
            while ($row = $result->fetch_assoc()):
                if ($currentDate !== $row['record_date']):
                    $currentDate = $row['record_date'];
                    echo "<h3>" . date("d F Y", strtotime($currentDate)) . "</h3>";
                endif;
        ?>
        <div class="email" data-id="<?= $row['id'] ?>" data-category="<?= htmlspecialchars($row['category']) ?>">
            <div class="client-info" style="cursor:pointer;">
                <strong><?= htmlspecialchars($row['client_name']) ?></strong> (<?= htmlspecialchars($row['phone']) ?>)<br>
                <?= htmlspecialchars($row['category']) ?> &rarr; <?= htmlspecialchars($row['service_name']) ?><br>
                <small><i class="far fa-clock"></i> <?= htmlspecialchars($row['record_time']) ?></small>
                <?php if (!empty($row['note'])): ?>
                    <div class="note-display" style="font-style: italic; color: #777; margin-top: 5px;"><i class="far fa-sticky-note"></i> <?= htmlspecialchars($row['note']) ?></div>
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
                    <option value="15:30">15:30</option><option value="16:30">16:30</option><option value="17:30">17:30</option><option value="18:30">18:30</option>
                </select>
            </div>
            <label for="client_name_input">Інформація про клієнта:</label>
            <input type="text" name="client_name" id="client_name_input" placeholder="Ім’я клієнта" required>
            <input type="tel" name="phone" placeholder="Телефон" required>
            <button type="submit" name="add_record">Зберегти запис</button>
        </form>
    </div>
</div>

<div id="editModal" class="modal-overlay">
    <div class="modal-box">
        <h2>Редагувати запис</h2>
        <form id="editForm" method="post">
            <input type="hidden" name="update_id" id="edit_id">
            <label>Ім'я клієнта:</label>
            <input type="text" name="client_name" id="edit_client" required>
            <label>Телефон:</label>
            <input type="tel" name="phone" id="edit_phone" required>
            <label>Послуга:</label>
            <input type="text" name="service_name" id="edit_service" required>
            <label>Примітка:</label>
            <textarea name="note" id="edit_note" rows="3"></textarea>
            <button type="submit">💾 Зберегти зміни</button>
        </form>
    </div>
</div>

<script>
    // Мобільне меню
const mobileBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('mobileOverlay');

if (mobileBtn) {
    mobileBtn.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Змінюємо іконку
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

// Закрити меню при кліку на затемнення
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

// Закрити меню при кліку на будь-який пункт меню (для зручності)
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
    const editModal = document.getElementById("editModal");
    const modalTitle = document.getElementById('modalTitle');
    const serviceSelect = document.getElementById('service_name_select');
    const categoryInput = document.getElementById('recordCategory');
    const addRecordForm = document.getElementById('addRecordForm');

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

    window.addEventListener('click', function(e) {
        if (addRecordBtn && !addRecordBtn.contains(e.target) && addRecordDropdown && !addRecordDropdown.contains(e.target)) {
            addRecordDropdown.classList.remove('visible');
        }
        if (e.target == recordModal) {
            recordModal.classList.remove("visible");
            addRecordForm.reset();
        }
        if (e.target == editModal) {
            editModal.classList.remove("visible");
        }
    });

    document.querySelectorAll(".client-info").forEach(el => {
        el.addEventListener("click", () => {
            let id = el.closest(".email").dataset.id;
            fetch("", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "get_record=" + id })
            .then(r => r.json()).then(data => {
                document.getElementById("edit_id").value = data.id;
                document.getElementById("edit_client").value = data.client_name;
                document.getElementById("edit_phone").value = data.phone;
                document.getElementById("edit_service").value = data.service_name;
                document.getElementById("edit_note").value = data.note || "";
                if(editModal) editModal.classList.add("visible");
            });
        });
    });

    document.getElementById("editForm").onsubmit = function(e) {
        e.preventDefault();
        let formData = new URLSearchParams(new FormData(this));
        fetch("", { method: "POST", body: formData })
        .then(r => r.text()).then(t => {
            if(t.trim()==="ok"){ location.reload(); }
            else alert("Error: "+t);
        });
    };

    document.getElementById("searchInput").addEventListener("keyup", function() {
        let filter = this.value.toLowerCase();
        let activeList = document.querySelector('#recordsList');
        if (window.getComputedStyle(activeList).display !== 'none') {
            activeList.querySelectorAll(".email").forEach(item => {
                let isVisible = item.style.display !== 'none';
                if (isVisible) {
                     item.style.display = item.innerText.toLowerCase().includes(filter) ? "flex" : "none";
                }
            });
        }
    });

    showSection('<?= $default_tab ?>');
});

function showSection(sec) {
    document.querySelectorAll('.main > div[id$="Section"], .main > div[id$="List"]').forEach(s => s.style.display = 'none');
    
    const categoryIcons = {'Масаж': 'fa-spa', 'Elos-епіляція': 'fa-star', 'Доглядові процедури': 'fa-pump-soap'};
    const recordsListDiv = document.getElementById('recordsList');
    const listTitle = document.getElementById('recordsListTitle');

    document.getElementById('searchInput').value = ''; // Clear search on tab change

    if (sec === 'all' || categoryIcons[sec]) {
        recordsListDiv.style.display = 'block';
        const emails = recordsListDiv.querySelectorAll(".email");
        if (sec === 'all') {
            listTitle.innerHTML = '<i class="fas fa-list-ul"></i> Усі записи';
            emails.forEach(e => e.style.display = 'flex');
        } else {
            listTitle.innerHTML = `<i class="fas ${categoryIcons[sec]}"></i> ${sec}`;
            emails.forEach(e => e.style.display = (e.dataset.category === sec) ? 'flex' : 'none');
        }
    } else {
        const sectionToShow = document.getElementById(sec + 'Section');
        if (sectionToShow) sectionToShow.style.display = 'block';
    }
    
    document.querySelectorAll('.sidebar .menu button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + sec)?.classList.add('active');
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
</script>
</body>
</html>