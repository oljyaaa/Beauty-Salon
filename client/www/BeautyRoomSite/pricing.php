<?php
// Підключення БД
// Переконайтеся, що файл db_config.php існує поруч
require_once __DIR__ . '/db_config.php';

$js_catalog = []; 

try {
    // 1) Отримуємо послуги (враховуємо регістр таблиць для Linux)
    // Використовуємо нижній регістр назв таблиць, як у вашому прикладі
    $services_stmt = $pdo->query("SELECT * FROM services ORDER BY service_id");
    $services_grouped = [];

    foreach ($services_stmt as $s) {
        $price_val = is_numeric($s['price_string']) ? (float)$s['price_string'] : $s['price_string'];
        if ($price_val == (int)$price_val) $price_val = (int)$price_val;

        $services_grouped[$s['category_id']][] = [$s['name'], $price_val];
    }

    // 2) Отримуємо категорії
    $categories_stmt = $pdo->query("SELECT * FROM servicecategories ORDER BY category_id");

    foreach ($categories_stmt as $c) {
        $js_catalog[] = [
            'title' => $c['title'],
            'items' => $services_grouped[$c['category_id']] ?? []
        ];
    }

} catch (PDOException $e) {
    // У продакшені краще не виводити деталі помилки користувачу, але для відладки залишаємо
    die("PDO ERROR: " . htmlspecialchars($e->getMessage()));
}
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <link rel="icon" href="images/logopnd.png" type="image/png">
    <title>Beauty Room — Прайс</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Prata&display=swap" rel="stylesheet">

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

    <style>
        /* --- ГЛОБАЛЬНІ СТИЛІ (СІРА ГАМА) --- */
        :root{
            --br-accent: #808080; /* Основний сірий */
            --br-dark: #333333;   /* Темно-сірий для заголовків */
            --br-muted: #666666;  /* Світло-сірий для тексту */
            --br-bg: #faf9fb;
        }

        body, p, .text p, span, li, .nav-link, a { 
            color: var(--br-muted) !important; 
            font-family: "Open Sans", sans-serif;
        }
        h1, h2, h3, h4, h5, h6, .heading-section h2, .subheading, .cart-head h5, .big-title { 
            color: var(--br-dark) !important; 
            font-family: "Prata", serif !important;
        }
        
        /* Кнопки */
        .btn.btn-primary { background: #808080 !important; border: 1px solid #808080 !important; color: #fff !important; }
        .btn.btn-primary:hover { background: #666 !important; border-color: #666 !important; }
        
        /* --- СТИЛІ КОШИКА (DRAWER) --- */
        .cart-drawer{
            position:fixed; right:-420px; top:0; width:420px; max-width:92vw; height:100vh; background:#fff; z-index:1050;
            box-shadow: -10px 0 30px rgba(0,0,0,.15); transition:right .28s ease-in-out; display:flex; flex-direction:column;
        }
        .cart-drawer.open{ right:0; }
        .cart-head{ padding:16px 18px; border-bottom:1px solid #eee; display:flex; align-items:center; justify-content:space-between; }
        .cart-body{ overflow:auto; padding:12px 16px; flex:1; }
        .cart-empty{ color:#888; padding:18px; text-align:center; }
        .cart-item{ display:grid; grid-template-columns:1fr auto auto; grid-column-gap:10px; align-items:center; padding:10px 0; border-bottom:1px dashed #e8e8ef; }
        .cart-item .title{ font-size:14px; font-weight:600; color: #333; }
        .cart-item .price{ font-weight:700; color: #666; }
        .cart-item button{ border:none; background:transparent; color:#b02a37; cursor: pointer; }
        .cart-foot{ border-top:1px solid #eee; padding:14px 16px; }
        
        /* Кнопка "Оформити" в кошику */
        .btn-checkout{
            background: var(--br-accent) !important; 
            border:none; color:#fff; border-radius:10px; padding:10px 14px; font-weight:700; width:100%;
        }
        .btn-checkout:hover{opacity:.95; background: #666 !important;}

        /* Іконка кошика в меню */
        .nav-cart{
            position:relative; display:inline-flex; align-items:center; justify-content:center;
            width:40px; height:40px; border-radius:50%; background:#e0e0e0; cursor:pointer;
            transition:.2s; margin-left:10px;
        }
        .nav-cart:hover{ background:#d0d0d0; }
        .nav-cart svg{ width:20px; height:20px; color: #555; }
        .cart-badge{
            position:absolute; top:-3px; right:-3px; background:#808080; color:#fff; font-size:10px;
            padding:2px 5px; border-radius:10px; min-width:18px; text-align:center; line-height:1.2; font-weight:700;
        }

        /* --- СТИЛІ ПРАЙСУ (Адаптація вашого старого коду під новий дизайн) --- */
        .col-head {
            font-family: "Prata", serif;
            font-weight: 700;
            color: var(--br-dark) !important;
            text-transform: uppercase;
            letter-spacing: .08em;
            font-size: 16px;
            margin: 0 0 15px 8px;
            border-bottom: 2px solid #eee;
            padding-bottom: 5px;
        }

        /* Стиль рядка категорії (catline) */
        .catline {
            display: grid; grid-template-columns: 1fr auto; align-items: center;
            padding: 12px 15px; 
            border-bottom: 1px solid #f0f0f0;
            font-weight: 700;
            color: var(--br-dark) !important;
            background: #fff;
            cursor: pointer;
            transition: 0.3s;
        }
        .catline:hover { background: #f9f9f9; }
        .catline .toggle {
            border: none; background: transparent; 
            font-size: 20px; line-height: 1; color: #808080;
        }
        .catline .toggle:focus { outline: none; }

        /* Стиль картки, в якій лежать категорії */
        .acc .card {
            border: none; 
            border-radius: 8px; 
            box-shadow: 0 5px 20px rgba(0,0,0,0.05); 
            margin-bottom: 20px;
            background: #fff;
            overflow: hidden;
        }
        
        /* Рядки послуг всередині категорії */
        .service-row {
            display: grid; grid-template-columns: 1fr auto auto; grid-column-gap: 10px; align-items: center;
            padding: 10px 0; 
            border-bottom: 1px dashed #eee; 
            font-size: 15px;
        }
        .service-row:last-child { border-bottom: none; }
        .service-row .name { font-weight: 600; color: var(--br-dark); }
        .service-row .price { font-weight: 700; color: var(--br-accent); }
        
        /* Кнопка Add */
        .service-row .add {
            background: #f2f2f2; 
            border: 1px solid #ccc; 
            color: #555; 
            padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
            transition: 0.3s;
            cursor: pointer;
        }
        .service-row .add:hover {
            background: var(--br-accent); 
            color: #fff;
            border-color: var(--br-accent);
        }

        .muted { color: var(--br-muted); }

        /* Адаптивність */
        @media (max-width:575.98px){
            .service-row { grid-template-columns: 1fr auto; grid-row-gap: 6px; }
            .service-row .price { order: 2; }
            .service-row .add { order: 3; justify-self: end; }
        }

        /* Loader колір */
        .path { stroke: #808080 !important; }
        #backdrop { position:fixed; inset:0; background:rgba(0,0,0,.35); display:none; z-index:1049; }
        
        /* =========================
   HEADER / NAV (як blog-single)
   ========================= */

/* Лінки меню */
.ftco_navbar .navbar-nav .nav-link{
  color:#333333 !important;
  padding: 0.75rem 1rem;
  position: relative;
  transition: color .2s;
}

/* Підкреслення при ховері */
.ftco_navbar .navbar-nav .nav-link::after{
  content:'';
  position:absolute;
  left:0;
  bottom:0.25rem;
  width:0;
  height:2px;
  background:#808080;
  transition: width .2s;
}

.ftco_navbar .navbar-nav .nav-link:hover{
  color:#000000 !important;
}
.ftco_navbar .navbar-nav .nav-link:hover::after{
  width:100%;
}

/* Активний пункт */
.ftco_navbar .navbar-nav .nav-item.active .nav-link{
  color:#000000 !important;
  font-weight:600;
}
.ftco_navbar .navbar-nav .nav-item.active .nav-link::after{
  width:100%;
}

/* Кошик — як на blog-single */
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
.nav-cart:hover{ background:#d0d0d0; }
.nav-cart svg{ width:20px; height:20px; color:#555; }

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

/* =========================
   FIX: контент не залазить під fixed navbar
   + мобілка: меню з самого верху
   ========================= */

/* Десктоп: відступ зверху для всього контенту */
@media (min-width: 992px){
  body{ padding-top: 90px; }
}

/* Мобілка: меню з самого верху, відступ робимо тільки секції */
@media (max-width: 991px){
  body{ padding-top: 0 !important; }

  .ftco_navbar{
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1030;
  }

  /* Щоб hero/контент не ліз під хедер */
  .hero-wrap,
  .ftco-section{
    margin-top: 0 !important;
    padding-top: 80px;
  }
}

    </style>
</head>
<body>

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
                    <li class="nav-item active"><a href="pricing.php" class="nav-link">Ціни та послуги</a></li>
                    <li class="nav-item"><a href="blog-single.php" class="nav-link">Поділись своїми враженнями</a></li>
                    <li class="nav-item"><a href="contact.html" class="nav-link">Зв'язатися / Запис</a></li>
                    
                    <li class="nav-item d-flex align-items-center">
                        <div id="openCart" class="nav-cart" title="Кошик">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M10 21h4"/>
                            </svg>
                            <span id="cartBadge" class="cart-badge" style="display:none">0</span>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
    <section class="hero-wrap hero-wrap-2" style="background-image: url('images/bg_3.jpg');" data-stellar-background-ratio="0.5">
        <div class="overlay"></div>
        <div class="container">
            <div class="row no-gutters slider-text js-fullheight align-items-center justify-content-center">
                <div class="col-md-9 ftco-animate text-center">
                    <h1 class="mb-3 bread">Прайс</h1>
                    <p class="breadcrumbs"><span class="mr-2"><a href="index.html">Головна</a></span> <span>Послуги та ціни</span></p>
                </div>
            </div>
        </div>
    </section>

    <section class="ftco-section">
        <div class="container">
            <div class="row justify-content-center mb-5 pb-3">
                <div class="col-md-7 heading-section ftco-animate text-center">
                    <h2 class="mb-1 big-title">Наші процедури</h2>
                    <p class="muted">Натисніть <b>Add</b>, щоб додати послугу у кошик</p>
                </div>
            </div>

            <div id="catalog" class="row"></div>

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
                <div class="col-md">
                    <div class="ftco-footer-widget mb-4">
                        <h2 class="ftco-heading-2">Контакти</h2>
                        <div class="block-23 mb-3">
                            <ul>
                                <li><span class="icon icon-map-marker"></span><span class="text">вулиця Європейська, 71, Бердичів</span></li>
                                <li><a href="tel:+380986411412"><span class="icon icon-phone"></span><span class="text">+380 98 641 1412</span></a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12 text-center">
                    <p class="mb-0">Copyright &copy;<span id="y"></span> All rights reserved</p>
                </div>
            </div>
        </div>
    </footer>

    <aside id="cartDrawer" class="cart-drawer" aria-hidden="true">
        <div class="cart-head">
            <h5>Кошик</h5>
            <button id="closeCart" class="btn btn-sm btn-outline-secondary">Закрити</button>
        </div>
        <div id="cartList" class="cart-body">
            <div class="cart-empty">Кошик порожній</div>
        </div>
        <div class="cart-foot">
            <div class="d-flex justify-content-between mb-2">
                <strong>Разом:</strong>
                <strong id="cartTotal">0 грн</strong>
            </div>
            <button id="btnCheckout" class="btn-checkout" type="button">Оформити</button>
        </div>
    </aside>
    <div id="backdrop"></div>

    <div id="ftco-loader" class="show fullscreen">
        <svg class="circular" width="48px" height="48px">
            <circle class="path-bg" cx="24" cy="24" r="22" fill="none" stroke-width="4" stroke="#eeeeee"/>
            <circle class="path" cx="24" cy="24" r="22" fill="none" stroke-width="4" stroke-miterlimit="10" stroke="#808080"/>
        </svg>
    </div>

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

    <script>
        // -------- DATA (Завантажено з БД) ----------
        const CATALOG = <?php echo json_encode($js_catalog, JSON_UNESCAPED_UNICODE); ?>;

        // ---------- JAVASCRIPT ПРАЙСУ ТА КОШИКА ----------
        const catalogEl = document.getElementById('catalog');
        const fmt = v => typeof v === 'number' ? `${v} грн` : `${v} грн`;

        // --- ГРУПУВАННЯ (З УКРАЇНСЬКИМИ НАЗВАМИ - ЯК У ВАС БУЛО) ---
        const COL1 = new Set([
          "Біоревіталізація",
          "Коктейлі під очі — Мезококтейлі",
          "Коктейлі під очі — Біоревіталізанти",
          "Мезотерапія",
          "Ботулінотерапія",
          "Філери для губ",
          "Колагеностимулятор"
        ]);
        const COL2 = new Set([
          "Лазерне омолодження",
          "Лазерне лікування куперозу",
          "Лазерне лікування акне",
          "Видалення судин",
          "SMAS-ліфтинг — Зони",
          "SMAS-ліфтинг — Сети"
        ]);
        const COL3 = new Set([
          "RF-ліфтинг — Мікроголковий",
          "RF-ліфтинг — Неінвазивний",
          "Лікування пігментації",
          "Плазмоліфтинг",
          "Екзосоми",
          "ELOS-епіляція — Обличчя",
          "ELOS-епіляція — Руки",
          "ELOS-епіляція — Ноги",
          "ELOS-епіляція — Спина / Груди / Живіт",
          "ELOS-епіляція — Інтимні зони",
          "ELOS-епіляція — Сети",
          "Електроепіляція",
          "Масаж",
          "Корекція фігури",
          "Доглядові процедури",
          "Коктейлі для лікування випадіння волосся"
        ]);
        
        function colOf(title){
          if(COL1.has(title)) return 0;
          if(COL2.has(title)) return 1;
          return 2; 
        }

        // Рендер елемента (вигляд рядка послуги)
        function renderItems(cat){
          return cat.items.map(([name, price]) => `
            <div class="service-row">
              <div class="name">${name}</div>
              <div class="price">${fmt(price)}</div>
              <button class="add" data-title="${cat.title}" data-name="${name}"
                data-price="${typeof price==='number'?price:String(price).split(' ')[0]}">Add</button>
            </div>
          `).join('');
        }

        // Рендер каталогу (Акордеон "catline" як у вашому старому коді)
        function renderCatalog(){
          const buckets = [[],[],[]];
          CATALOG.forEach(cat => buckets[colOf(cat.title)].push(cat));

          const COL_TITLES = [
            "Ін’єкційні процедури",
            "Лазер / SMAS",
            "RF / пігментація / інше"
          ];

          const colHtml = buckets.map((cats, colIdx) => {
            const body = cats.map((cat, i) => {
              const cid = `g${colIdx}-c${i}`;
              return `
                <div class="catline" data-toggle="collapse" data-target="#${cid}" aria-expanded="false" aria-controls="${cid}">
                  <div>${cat.title}</div>
                  <button class="toggle">+</button>
                </div>
                <div id="${cid}" class="collapse">
                  <div class="card-body" style="padding:6px 10px 15px 10px; border-bottom:1px solid #eee;">
                    ${renderItems(cat)}
                  </div>
                </div>
              `;
            }).join('');

            return `
              <div class="col-lg-4 col-md-6 mb-4">
                <div class="col-head">${COL_TITLES[colIdx]}</div>
                <div class="acc">
                  <div class="card">
                    <div class="card-body" style="padding:10px 0;">
                      ${body || '<div class="muted text-center p-3">Немає категорій</div>'}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('');

          catalogEl.innerHTML = `<div class="row">${colHtml}</div>`;
          bindAddButtons();
          bindCheckoutButton();
        }

        function bindAddButtons(){
          document.querySelectorAll('.add').forEach(btn=>{
            btn.addEventListener('click',()=>{
              const item = {
                cat: btn.getAttribute('data-title'),
                name: btn.getAttribute('data-name'),
                price: Number(btn.getAttribute('data-price')) || 0,
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`
              };
              addToCart(item);
            });
          });
        }

        // ---------- CART (localStorage) ----------
        const LS_KEY = 'beautyRoomCart';
        const drawer = document.getElementById('cartDrawer');
        const backdrop = document.getElementById('backdrop');
        const cartList = document.getElementById('cartList');
        const cartTotal = document.getElementById('cartTotal');
        const badge = document.getElementById('cartBadge');
        
        function loadCart(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }catch{ return []; } }
        function saveCart(c){ localStorage.setItem(LS_KEY, JSON.stringify(c)); }
        
        function addToCart(item){ const c = loadCart(); c.push(item); saveCart(c); renderCart(); openCart(); }
        function removeFromCart(id){ const c = loadCart().filter(x=>x.id!==id); saveCart(c); renderCart(); }
        function sumCart(c){ return c.reduce((s,x)=>s+(Number(x.price)||0),0); }
        
        function renderCart(){
          const c = loadCart();
          const n = c.length;
          badge.style.display = n? 'block':'none';
          badge.textContent = n;
          if(!n){ cartList.innerHTML = `<div class="cart-empty">Кошик порожній</div>`; cartTotal.textContent = '0 грн'; return; }
          cartList.innerHTML = c.map(x=>`
            <div class="cart-item">
              <div class="title">${x.name}<div class="muted" style="font-size:12px">${x.cat}</div></div>
              <div class="price">${x.price} грн</div>
              <button title="Видалити" onclick="removeFromCart('${x.id}')">&times;</button>
            </div>
          `).join('');
          cartTotal.textContent = `${sumCart(c)} грн`;
        }
        
        function openCart(){ drawer.classList.add('open'); backdrop.style.display='block'; drawer.setAttribute('aria-hidden','false'); }
        function closeCart(){ drawer.classList.remove('open'); backdrop.style.display='none'; drawer.setAttribute('aria-hidden','true'); }

        document.getElementById('openCart').addEventListener('click', openCart);
        document.getElementById('closeCart').addEventListener('click', closeCart);
        backdrop.addEventListener('click', closeCart);

        // ---------- ПЕРЕХІД НА СТОРІНКУ ЗАПИСУ ----------
        function goToBooking(){
          const c = loadCart();
          if(!c.length){ alert('Кошик порожній'); return; }
          window.location.href = 'contact.html?from=cart';
        }
        function bindCheckoutButton(){
          const btn = document.querySelector('#btnCheckout') || document.querySelector('.btn-checkout');
          if(btn){
            btn.addEventListener('click', goToBooking);
          }
        }

        // init
        document.getElementById('y').textContent = new Date().getFullYear();
        renderCatalog();
        renderCart();

        // Автозакриття меню
        $(document).ready(function () {
            $('.navbar-nav>li>a').on('click', function(){ $('.navbar-collapse').collapse('hide'); });
        });
    </script>
</body>
</html>