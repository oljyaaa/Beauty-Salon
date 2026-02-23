<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ПРАВИЛЬНЕ ПІДКЛЮЧЕННЯ ДО БАЗИ (хостинг)
$conn = new mysqli(
    "dg602726.mysql.tools",
    "dg602726_salon",
    "C4cxy5D^+8",
    "dg602726_salon"
);

if ($conn->connect_error) {
    die("Помилка підключення: " . $conn->connect_error);
}
?>

<!DOCTYPE html>
<html lang="uk">
  <head>
      <link rel="icon" href="images/logopnd.png" type="image/png">
    <title>Beauty Room</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Prata&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/debug.css">
    <link rel="stylesheet" href="css/open-iconic-bootstrap.min.css">
    <link rel="stylesheet" href="css/animate.css">
    <link rel="stylesheet" href="css/owl.carousel.min.css">
    <link rel="stylesheet" href="css/owl.theme.default.min.css">
    <link rel="stylesheet" href="css/magnific-popup.css">
    <link rel="stylesheet" href="css/aos.css">
    <link rel="stylesheet" href="css/ionicons.min.css">
    <link rel="stylesheet" href="css/bootstrap-datepicker.css">
    <link rel="stylesheet" href="css/jquery.timepicker.css">
    <link rel="stylesheet" href="css/flaticon.css">
    <link rel="stylesheet" href="css/icomoon.css">
    <link rel="stylesheet" href="css/style.css">

    <!-- Cloudflare Turnstile -->
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

    <style>
      .alert-msg{
        padding:10px 14px;
        border-radius:4px;
        margin-bottom:15px;
        font-size:14px;
      }
      .alert-error{
        background:#ffe5e5;
        color:#b10000;
        border:1px solid #ffb3b3;
      }
      .alert-ok{
        background:#e5ffe9;
        color:#096b26;
        border:1px solid #9be0ac;
      }

      /* Помилка під капчею */
      .captcha-error{
        font-size: 13px;
        color: #b10000;
      }

      /* ХЕДЕР – стилі для меню */
      .ftco_navbar .navbar-nav .nav-link {
        color:#333333 !important;
        padding: 0.75rem 1rem;
        position: relative;
        transition: color .2s;
      }

      .ftco_navbar .navbar-nav .nav-link::after {
        content:'';
        position:absolute;
        left:0;
        bottom:0.25rem;
        width:0;
        height:2px;
        background:#808080;
        transition: width .2s;
      }

      .ftco_navbar .navbar-nav .nav-link:hover {
        color:#000000 !important;
      }

      .ftco_navbar .navbar-nav .nav-link:hover::after {
        width:100%;
      }

      .ftco_navbar .navbar-nav .nav-item.active .nav-link {
        color:#000000 !important;
        font-weight:600;
      }

      .ftco_navbar .navbar-nav .nav-item.active .nav-link::after {
        width:100%;
      }

      /* Кнопка кошика + дровер (як на contact/pricing) */
      .nav-cart{
        position:relative; 
        display:inline-flex; 
        align-items:center; 
        justify-content:center;
        width:40px; 
        height:40px; 
        border-radius:50%; 
        background:#e0e0e0; 
        cursor:pointer;
        transition:.2s; 
        margin-left:10px;
      }
      .nav-cart:hover{background:#d0d0d0}
      .nav-cart svg{width:20px;height:20px;color:#555}
      .cart-badge{
        position:absolute; 
        top:-3px; 
        right:-3px; 
        background:#808080; 
        color:#fff; 
        font-size:10px;
        padding:2px 5px; 
        border-radius:10px; 
        min-width:18px; 
        text-align:center; 
        line-height:1.2; 
        font-weight:700;
      }
      .cart-drawer{
        position:fixed;
        right:-420px;
        top:0;
        width:420px;
        max-width:92vw;
        height:100vh;
        background:#ffffff !important;
        z-index:1050;
        box-shadow:-10px 0 30px rgba(0,0,0,.15);
        transition:right .28s ease-in-out;
        display:flex;
        flex-direction:column;
      }
      .cart-drawer.open{ right:0; }
      .cart-head{ 
        padding:16px 18px; 
        border-bottom:1px solid #eee; 
        display:flex; 
        align-items:center; 
        justify-content:space-between; 
      }
      .cart-body{ 
        overflow:auto; 
        padding:12px 16px; 
        flex:1 
      }
      .cart-empty{ 
        color:#888; 
        padding:18px; 
        text-align:center 
      }
      .cart-item{ 
        display:grid; 
        grid-template-columns:1fr auto auto; 
        grid-column-gap:10px; 
        align-items:center; 
        padding:10px 0; 
        border-bottom:1px dashed #e8e8ef; 
      }
      .cart-item .title{ 
        font-size:14px; 
        font-weight:600 
      }
      .cart-item .price{ 
        font-weight:700 
      }
      .cart-item button{ 
        border:none; 
        background:transparent; 
        color:#b02a37; 
        cursor:pointer; 
      }
      .cart-foot{ 
        border-top:1px solid #eee; 
        padding:14px 16px 
      }
      .btn-outline-danger.btn-sm{ 
        padding:2px 8px; 
      }
      #backdrop { 
        position:fixed; 
        inset:0; 
        background:rgba(0,0,0,.35); 
        display:none; 
        z-index:1049 
      }

      .btn.btn-primary { 
        background: #808080 !important; 
        border: 1px solid #808080 !important; 
        color: #ffffff !important; 
      }
      .btn.btn-primary:hover { 
        background: #666666 !important; 
        border-color: #666666 !important; 
        color: #ffffff !important; 
      }
      body {
  padding-top: 90px;
}

@media (max-width: 991px) {
  body {
    padding-top: 0px;
  }
    </style>
  </head>
  <body>

    <!-- ОНОВЛЕНИЙ ХЕДЕР З КОШИКОМ -->
    <nav class="navbar navbar-expand-lg navbar-light ftco_navbar ftco-navbar-light" id="ftco-navbar" style="background-color:#d9d9d9 !important;">
      <div class="container">
        <a class="navbar-brand" href="index.html">
          <img src="images/logopnd.png" alt="Beauty Room" style="height:50px;">
        </a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#ftco-nav" aria-controls="ftco-nav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="oi oi-menu"></span> 
        </button>
        <div class="collapse navbar-collapse" id="ftco-nav">
          <ul class="navbar-nav ml-auto">
            <li class="nav-item"><a href="index.html" class="nav-link">Головна</a></li>
            <li class="nav-item"><a href="specialists.html" class="nav-link">Наші працівники</a></li>
            <li class="nav-item"><a href="pricing.php" class="nav-link">Ціни та послуги</a></li>
            <li class="nav-item active"><a href="blog-single.php" class="nav-link">Поділись своїми враженнями</a></li>
            <li class="nav-item"><a href="contact.html" class="nav-link">Зв'язатися / Запис</a></li>

            <!-- 🛒 Іконка кошика -->
            <li class="nav-item d-flex align-items-center">
              <div id="openCart" class="nav-cart" title="Кошик">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M10 21h4"/>
                </svg>
                <span id="cartBadge" class="cart-badge" style="display:none">0</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <!-- END nav -->

    <section class="ftco-section">
      <div class="container">
        <div class="row">
          <div class="col-lg-8 ftco-animate">

            <h2 class="mb-3">Залиште тут своє враження від процедур✨</h2>
            <p><img src="images/logosite.png" alt="" class="img-fluid"></p>

            <!-- Вивід коментарів -->
            <div class="pt-5 mt-5">
              <h3 class="mb-5">Коментарі</h3>
              <?php
              $result = $conn->query("SELECT * FROM comments WHERE status='approved' ORDER BY created_at DESC");
              if(!$result){
                  die("SQL Error: " . $conn->error);
              }
              echo '<ul class="comment-list">';
              if ($result->num_rows > 0) {
                  while($row = $result->fetch_assoc()) {
                      echo '<li class="comment ftco-animate">
                              <div class="vcard bio">
                                <img src="https://media.istockphoto.com/id/2171382633/vector/user-profile-icon-anonymous-person-symbol-blank-avatar-graphic-vector-illustration.jpg?s=170667a&w=0&k=20&c=C0GFBgcEAPMXFFQBSK-rS2Omt9sUGImXfJE_8JOWC0M=" alt="Image placeholder">
                              </div>
                              <div class="comment-body">
                                <h3>'.htmlspecialchars($row['name']).'</h3>
                                <div class="meta">'.htmlspecialchars($row['created_at']).'</div>
                                <p>'.htmlspecialchars($row['description']).'</p>
                              </div>
                            </li>';
                  }
              } else {
                  echo "<p>Коментарів поки немає. Будьте першим!</p>";
              }
              echo '</ul>';
              ?>
            </div>

            <!-- Форма додавання коментаря -->
            <div id="comment-form" class="comment-form-wrap pt-5 ftco-animate">
              <h3 class="mb-5">Залишити коментар</h3>

              <?php if (!empty($_GET['captcha_error'])): ?>
                <div class="alert-msg alert-error">
                  Не вдалося підтвердити, що ви не робот (перевірка Turnstile). Спробуйте ще раз.
                </div>
              <?php endif; ?>

              <?php if (!empty($_GET['success'])): ?>
                <div class="alert-msg alert-ok">
                  Дякуємо! Ваш коментар надіслано та очікує модерації (або вже опублікований).
                </div>
              <?php endif; ?>

              <form action="save_comment.php" method="POST" class="bg-light p-4">
                <div class="form-group">
                  <label for="name">Ім'я *</label>
                  <input type="text" class="form-control bg-white" id="name" name="name" required>
                </div>
                <div class="form-group">
                  <label for="email">Email *</label>
                  <input type="email" class="form-control" id="email" name="email" required>
                </div>
                <div class="form-group">
                  <label for="service">Послуга</label>
                  <select class="form-control" id="service" name="service">
                    <option value="" disabled selected>Оберіть послугу...</option>
                    <option value="Доглядові процедури">Доглядові процедури</option>
                    <option value="Корекція фігури">Корекція фігури</option>
                    <option value="Масаж">Масаж</option>
                    <option value="Elos - епіляція">Elos - епіляція</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="message">Опис</label>
                  <textarea id="message" cols="30" rows="10" class="form-control" name="description" required></textarea>
                </div>

                <!-- Cloudflare Turnstile widget -->
                <div class="form-group">
                  <div class="cf-turnstile"
                       data-sitekey="0x4AAAAAACDoXkL3vG25cwIE">
                  </div>

                  <!-- Текст помилки капчі -->
                  <div id="captchaError"
                       class="captcha-error"
                       style="display:none; margin-top:5px;">
                    Будь ласка, підтвердіть, що ви не робот (заповніть капчу).
                  </div>
                </div>
                <!-- /Cloudflare Turnstile -->

                <div class="form-group">
                  <input type="submit" value="Надіслати коментар" class="btn py-3 px-4 btn-primary">
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </section>

    <footer class="ftco-footer ftco-section">
      <div class="container">
        <div class="row d-flex">
          <div class="col-md">
            <div class="ftco-footer-widget mb-4">
              <h2 class="ftco-heading-2">Beauty Room</h2>
              <p>Простір краси✨</p>
            </div>
          </div>
        </div>
      </div>
    </footer>

    <!-- 🛒 Drawer кошика (глобальний) -->
    <aside id="cartDrawer" class="cart-drawer" aria-hidden="true">
      <div class="cart-head">
        <h5>Кошик</h5>
        <div>
          <button id="clearCart" class="btn btn-outline-danger btn-sm">Очистити</button>
          <button id="closeCart" class="btn btn-sm btn-outline-secondary">Закрити</button>
        </div>
      </div>
      <div id="cartList" class="cart-body">
        <div class="cart-empty">Кошик порожній</div>
      </div>
      <div class="cart-foot">
        <div class="d-flex justify-content-between mb-2">
          <strong>Разом:</strong><strong id="cartTotal">0 грн</strong>
        </div>
        <!-- На цій сторінці ведемо юзера на сторінку запису -->
        <a href="contact.html#appointmentForm" class="btn btn-primary btn-block">Перейти до запису</a>
      </div>
    </aside>
    <div id="backdrop"></div>

    <!-- JS підключення -->
    <script src="js/jquery.min.js"></script>
    <script src="js/jquery-migrate-3.0.1.min.js"></script>
    <script src="js/popper.min.js"></script>
    <script src="js/bootstrap.min.js"></script>
    <script src="js/jquery.easing.1.3.js"></script>
    <script src="js/jquery.waypoints.min.js"></script>
    <script src="js/jquery.stellar.min.js"></script>
    <script src="js/owl.carousel.min.js"></script>
    <script src="js/jquery.magnific-popup.min.js"></script>
    <script src="js/aos.js"></script>
    <script src="js/jquery.animateNumber.min.js"></script>
    <script src="js/bootstrap-datepicker.js"></script>
    <script src="js/jquery.timepicker.min.js"></script>
    <script src="js/scrollax.min.js"></script>
    <script src="js/main.js"></script>

    <!-- Логіка кошика + перевірка капчі -->
    <script>
      const LS_KEY = 'beautyRoomCart';
      const drawer = document.getElementById('cartDrawer');
      const backdrop = document.getElementById('backdrop');
      const cartList = document.getElementById('cartList');
      const cartTotal = document.getElementById('cartTotal');
      const badge = document.getElementById('cartBadge');

      function loadCart(){
        try{
          return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        }catch(e){
          console.error(e);
          return [];
        }
      }
      function saveCart(c){
        localStorage.setItem(LS_KEY, JSON.stringify(c));
      }
      function sumCart(c){
        return c.reduce((s,x)=>s+(Number(x.price)||0),0);
      }
      function removeFromCart(id){
        const c = loadCart().filter(x=>x.id!==id);
        saveCart(c);
        renderCart();
      }
      function clearCart(){
        saveCart([]);
        renderCart();
      }

      function renderCart(){
        const c = loadCart();
        const n = c.length;
        if(badge){
          badge.style.display = n ? 'block' : 'none';
          badge.textContent = n;
        }

        if(!n){
          cartList.innerHTML = '<div class="cart-empty">Кошик порожній</div>';
          cartTotal.textContent = '0 грн';
        }else{
          cartList.innerHTML = c.map(x=>`
            <div class="cart-item">
              <div class="title">
                ${x.name}
                <div class="text-muted" style="font-size:12px">${x.cat || ''}</div>
              </div>
              <div class="price">${x.price} грн</div>
              <button title="Видалити" onclick="removeFromCart('${x.id}')">&times;</button>
            </div>
          `).join('');
          cartTotal.textContent = sumCart(c) + ' грн';
        }
      }

      function openCart(){
        drawer.classList.add('open');
        backdrop.style.display='block';
        drawer.setAttribute('aria-hidden','false');
      }
      function closeCart(){
        drawer.classList.remove('open');
        backdrop.style.display='none';
        drawer.setAttribute('aria-hidden','true');
      }

      document.getElementById('openCart').addEventListener('click', openCart);
      document.getElementById('closeCart').addEventListener('click', closeCart);
      document.getElementById('clearCart').addEventListener('click', clearCart);
      backdrop.addEventListener('click', closeCart);

      // jQuery після підключення
      $(document).ready(function () {
        // Автозакриття меню на мобілці
        $('.navbar-nav>li>a').on('click', function(){
          $('.navbar-collapse').collapse('hide');
        });

        // ✅ Перевірка капчі Turnstile перед відправкою форми коментаря
        $('#comment-form form').on('submit', function(e){
          const tokenInput = document.querySelector('input[name="cf-turnstile-response"]');
          const errorBlock = document.getElementById('captchaError');

          if (errorBlock) {
            errorBlock.style.display = 'none';
          }

          if (!tokenInput || !tokenInput.value) {
            e.preventDefault();

            if (errorBlock) {
              errorBlock.style.display = 'block';
              errorBlock.textContent = 'Будь ласка, підтвердіть, що ви не робот (заповніть капчу).';

              errorBlock.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
            }
          }
        });
      });

      // Ініціалізація кошика
      renderCart();
    </script>

  </body>
</html>

<?php $conn->close(); ?>
