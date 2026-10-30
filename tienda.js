/**
 * Vantage Sport — Tienda Oficial & Marketplace de Clientes (Estilo Mercado Libre)
 * Logica de catalogo abierto, busqueda, filtros, comparador, carrito y
 * sistema de preguntas al vendedor con restriccion de autenticacion.
 */

(() => {
  'use strict';

  // Configuración Supabase
  const config = window.VANTAGE_CONFIG || {
    SUPABASE_URL: 'https://kwyycebjmdgxihbtjwqy.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_XWP4yM1-sYMwkJN5s6_I3w_gWDq6gNr'
  };

  let sbClient = null;
  if (window.supabase && config.SUPABASE_URL && config.SUPABASE_PUBLISHABLE_KEY) {
    try {
      sbClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY);
    } catch (e) {
      console.warn('No se pudo inicializar Supabase Client:', e);
    }
  }

  // Catálogo Deportivo Oficial de Vantage Sport (Prendas de Alto Rendimiento)
  const DEFAULT_SPORTS_PRODUCTS = [
    {
      id: 'V001',
      title: 'Camiseta Técnica Vantage Pro Matchday Dri-FIT',
      category: 'Fútbol',
      sport: 'Fútbol',
      price: 49.99,
      originalPrice: 79.99,
      discount: 37,
      rating: 4.9,
      reviewsCount: 342,
      soldCount: 1250,
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'deal',
      badgeText: 'OFERTA RELÁMPAGO',
      isFull: true,
      freeShipping: true,
      stock: 24,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['#101411', '#d4ff3f', '#ffffff'],
      material: '100% Poliéster Reciclado AeroWeave',
      technology: 'Vantage Dry-Ventilated (Expulsa el sudor en 30s)',
      description: 'Diseñada para el fútbol de alta exigencia. Microfibras ventiladas en axilas y espalda que reducen el peso y mantienen el cuerpo fresco en situaciones de máxima pulsación.',
      questions: [
        {
          q: '¿La horma es ajustada o estándar?',
          a: '¡Hola! Es un corte atlético semi-ajustado. Si prefieres un calce más holgado para entrenar con comodidad, te recomendamos pedir una talla más.',
          date: 'Hace 2 días'
        },
        {
          q: '¿Viene con el parche oficial de Vantage en la manga?',
          a: '¡Hola! Sí, incluye el sello termosellado en relieve "Vantage Athletic Dept.®" en la manga izquierda y cuello reforzado.',
          date: 'Hace 5 días'
        }
      ]
    },
    {
      id: 'V002',
      title: 'Hoodie Térmico Vantage Performance Fleece con Capucha Tech',
      category: 'Abrigo',
      sport: 'Training',
      price: 68.50,
      originalPrice: 95.00,
      discount: 28,
      rating: 4.8,
      reviewsCount: 215,
      soldCount: 890,
      image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'drop',
      badgeText: 'DROP EXCLUSIVO',
      isFull: true,
      freeShipping: true,
      stock: 15,
      sizes: ['M', 'L', 'XL'],
      colors: ['#232a25', '#101411', '#d4ff3f'],
      material: '80% Algodón Peinado Orgánico, 20% Poliéster Tech',
      technology: 'Thermal Shield Pro (Aislamiento ligero sin abultar)',
      description: 'El polerón definitivo para antes y después del partido. Bolsillo tipo canguro sellado y capucha ergonómica con cordones reflectantes de seguridad.',
      questions: [
        {
          q: '¿Encoge al lavarlo en lavadora?',
          a: '¡Hola! No, la tela viene pre-encogida de fábrica. Te recomendamos lavar con agua fría y no usar secadora a altas temperaturas.',
          date: 'Hace 1 día'
        }
      ]
    },
    {
      id: 'V003',
      title: 'Zapatillas de Running Vantage Nitro Speed Max Pro',
      category: 'Calzado',
      sport: 'Running',
      price: 119.90,
      originalPrice: 169.90,
      discount: 30,
      rating: 4.95,
      reviewsCount: 520,
      soldCount: 2100,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'deal',
      badgeText: 'MÁS VENDIDO ⚡',
      isFull: true,
      freeShipping: true,
      stock: 8,
      sizes: ['39', '40', '41', '42', '43', '44'],
      colors: ['#fc6536', '#101411', '#ffffff'],
      material: 'Malla Jacquard Transpirable + Placa de Carbono',
      technology: 'Nitro Energy Foam (Retorno del 84% de energía)',
      description: 'Diseñadas para maratonistas y corredores exigentes. Suela de espuma nitrogenada ultra ligera con placa propulsora para pulverizar tus mejores tiempos.',
      questions: [
        {
          q: '¿Sirven para pisada pronadora o neutra?',
          a: '¡Hola! Tienen soporte para pisada neutra y leve pronación gracias a su chasis estabilizador en el talón.',
          date: 'Hace 3 días'
        },
        {
          q: '¿Tienen stock en talla 42 en despacho FULL?',
          a: '¡Hola! Sí, nos quedan 4 pares en almacén FULL con entrega al día siguiente garantizada.',
          date: 'Ayer'
        }
      ]
    },
    {
      id: 'V004',
      title: 'Shorts de Compresión Vantage Pro Combat con Bolsillo Teléfono',
      category: 'Shorts',
      sport: 'Training',
      price: 32.00,
      originalPrice: 48.00,
      discount: 33,
      rating: 4.7,
      reviewsCount: 168,
      soldCount: 940,
      image: 'https://images.unsplash.com/photo-1506636574312-32087423a636?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1506636574312-32087423a636?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'full',
      badgeText: 'ENVÍO FULL',
      isFull: true,
      freeShipping: false,
      stock: 35,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['#101411', '#5c655d'],
      material: '85% Poliamida, 15% Spandex 4-Way Stretch',
      technology: 'Muscle-Support Graduated Compression',
      description: 'Soporte muscular graduado que reduce la vibración en cuádriceps e isquiotibiales durante sprints y sentadillas pesadas. Incluye bolsillo interno seguro antideslizante para móvil.',
      questions: [
        {
          q: '¿El bolsillo aguanta un iPhone grande sin rebotar?',
          a: '¡Hola! Sí, está ubicado en el lateral del muslo con tensión justa para que no se mueva al correr.',
          date: 'Hace 6 días'
        }
      ]
    },
    {
      id: 'V005',
      title: 'Jersey Oficial Vantage Retro 90s Street Edition',
      category: 'Fútbol',
      sport: 'Fútbol',
      price: 54.00,
      originalPrice: 75.00,
      discount: 28,
      rating: 4.9,
      reviewsCount: 194,
      soldCount: 620,
      image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'drop',
      badgeText: 'EDICIÓN ESPECIAL',
      isFull: true,
      freeShipping: true,
      stock: 12,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['#191e1b', '#d4ff3f'],
      material: 'Poliéster Heavy Mesh Vintage',
      technology: 'Retro-Comfort Finish con cuello polo elástico',
      description: 'Homenaje a la época dorada de las camisetas de fútbol noventeras con el toque vanguardista de Vantage Athletic. Gráficos geométricos sublimados indelebles.',
      questions: [
        {
          q: '¿Se le puede estampar número y nombre?',
          a: '¡Hola! Por ahora se envían en su versión oficial limpia de catálogo sin dorsal personalizado.',
          date: 'Hace 4 días'
        }
      ]
    },
    {
      id: 'V006',
      title: 'Leggings de Alto Rendimiento Vantage High-Waist Seamless',
      category: 'Pantalones',
      sport: 'Fitness',
      price: 44.90,
      originalPrice: 65.00,
      discount: 31,
      rating: 4.85,
      reviewsCount: 280,
      soldCount: 1400,
      image: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'deal',
      badgeText: 'OFERTA DESTACADA',
      isFull: true,
      freeShipping: true,
      stock: 19,
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['#101411', '#343a32', '#fc6536'],
      material: 'Nylon Seamless Ultra Suave + Elastano',
      technology: 'Squat-Proof 100% No Transparente',
      description: 'Cintura alta compresiva que moldea y no se enrolla. Tejido sin costuras que evita rozaduras durante sesiones de Crossfit, yoga o running de larga distancia.',
      questions: [
        {
          q: '¿Es 100% a prueba de sentadillas (squat proof)?',
          a: '¡Totalmente garantizado! Probado en laboratorio textil: no transparenta incluso en máxima elongación.',
          date: 'Hace 1 semana'
        }
      ]
    },
    {
      id: 'V007',
      title: 'Chaqueta Cortavientos Ultralight Vantage Aero Shield',
      category: 'Abrigo',
      sport: 'Running',
      price: 74.99,
      originalPrice: 110.00,
      discount: 32,
      rating: 4.75,
      reviewsCount: 98,
      soldCount: 430,
      image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'full',
      badgeText: 'ENVÍO FULL',
      isFull: true,
      freeShipping: true,
      stock: 10,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['#d4ff3f', '#191e1b'],
      material: 'Ripstop 20D Repelente al Agua (DWR)',
      technology: 'Packable Tech (Se empaca en su propio bolsillo)',
      description: 'Pesa menos de 140 gramos. Protección total contra viento y llovizna con bandas reflectivas 360° para entrenar de noche con máxima visibilidad.',
      questions: [
        {
          q: '¿Resiste lluvia fuerte o solo llovizna?',
          a: '¡Hola! Es cortavientos con tratamiento DWR repelente para lloviznas y lluvia ligera/moderada.',
          date: 'Hace 3 días'
        }
      ]
    },
    {
      id: 'V008',
      title: 'Balón Oficial de Fútbol Vantage Match Ball FIFA Quality Pro',
      category: 'Accesorios',
      sport: 'Fútbol',
      price: 39.99,
      originalPrice: 59.99,
      discount: 33,
      rating: 4.9,
      reviewsCount: 410,
      soldCount: 1800,
      image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'deal',
      badgeText: 'MÁS VENDIDO ⚡',
      isFull: true,
      freeShipping: true,
      stock: 45,
      sizes: ['Talla 5 Oficial'],
      colors: ['#ffffff'],
      material: 'PU Texturizado Termosellado sin costuras',
      technology: 'Aero-Groove Aerodinámica Estable',
      description: 'Balón oficial de competición con absorción de agua nula y trayectoria precisa en tiros libres y cambios de frente. Cámara de butilo de alta retención de aire.',
      questions: [
        {
          q: '¿Viene inflado o desinflado?',
          a: '¡Hola! Se despacha inflado a presión óptima en caja de protección individual.',
          date: 'Hace 2 días'
        }
      ]
    },
    {
      id: 'V009',
      title: 'Top Deportivo Sujeción Máxima Vantage Core Impact Racerback',
      category: 'Tops',
      sport: 'Fitness',
      price: 29.50,
      originalPrice: 42.00,
      discount: 30,
      rating: 4.88,
      reviewsCount: 175,
      soldCount: 810,
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'full',
      badgeText: 'ENVÍO FULL',
      isFull: true,
      freeShipping: false,
      stock: 22,
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['#101411', '#fc6536', '#d4ff3f'],
      material: 'Poliéster Reciclado & Elastano de Doble Densidad',
      technology: 'Anti-Bounce Support System',
      description: 'Sujeción de alto impacto para running, HIIT y deportes de contacto. Almohadillas extraíbles transpirables y espalda deportiva que libera los omóplatos.',
      questions: [
        {
          q: '¿Sirve para copa D en deportes de salto?',
          a: '¡Hola! Sí, la banda elástica inferior de 4cm y los tirantes anchos ofrecen soporte de grado profesional para copas C y D.',
          date: 'Hace 5 días'
        }
      ]
    },
    {
      id: 'V010',
      title: 'Mochila Técnica Deportiva Vantage Gym & Match 35L',
      category: 'Accesorios',
      sport: 'Training',
      price: 49.00,
      originalPrice: 70.00,
      discount: 30,
      rating: 4.8,
      reviewsCount: 130,
      soldCount: 520,
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'deal',
      badgeText: 'RECOMENDADO',
      isFull: true,
      freeShipping: true,
      stock: 14,
      sizes: ['35 Litros'],
      colors: ['#101411'],
      material: 'Cordura Balística 600D Impermeable',
      technology: 'Shoe Compartment Ventilated + Laptop Sleeve 16"',
      description: 'Compartimento inferior aislado para zapatillas con ventilación metálica, bolsillo húmedo para ropa sudada y funda acolchada para laptop.',
      questions: [
        {
          q: '¿Caben zapatillas de caña alta talla 44?',
          a: '¡Hola! Sí, el compartimento inferior está dimensionado para calzado hasta talla 46 europea.',
          date: 'Hace 4 días'
        }
      ]
    },
    {
      id: 'V011',
      title: 'Pantalón Jogger Técnico Vantage Street Athlete Pro',
      category: 'Pantalones',
      sport: 'Lifestyle',
      price: 52.50,
      originalPrice: 75.00,
      discount: 30,
      rating: 4.78,
      reviewsCount: 112,
      soldCount: 490,
      image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'drop',
      badgeText: 'STREET WEAR',
      isFull: true,
      freeShipping: true,
      stock: 16,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['#191e1b', '#343a32'],
      material: 'Tech Terry de Peso Medio con Elastano',
      technology: 'Tapered Ankle Zippers (Cremalleras en tobillo)',
      description: 'Corte cónico moderno con cremalleras invisibles en los tobillos para ponerte o quitarte el pantalón sin necesidad de sacarte las zapatillas de fútbol.',
      questions: [
        {
          q: '¿Los bolsillos tienen cremallera?',
          a: '¡Hola! Sí, ambos bolsillos laterales cuentan con cremalleras YKK selladas al calor.',
          date: 'Hace 3 días'
        }
      ]
    },
    {
      id: 'V012',
      title: 'Gorra Técnica de Competición Vantage Laser AirFlow',
      category: 'Accesorios',
      sport: 'Running',
      price: 22.00,
      originalPrice: 32.00,
      discount: 31,
      rating: 4.85,
      reviewsCount: 160,
      soldCount: 780,
      image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80'
      ],
      badge: 'full',
      badgeText: 'ENVÍO FULL',
      isFull: true,
      freeShipping: false,
      stock: 40,
      sizes: ['Talla Única Ajustable'],
      colors: ['#101411', '#ffffff', '#d4ff3f'],
      material: 'Microfibra Perforada por Láser UPF 50+',
      technology: 'Quick-Dry Sweatband & Anti-Glare Visor',
      description: 'Microperforaciones laterales para disipar el calor en días soleados de carrera. Visera inferior negra que absorbe el reflejo de la luz solar.',
      questions: [
        {
          q: '¿Se lava a máquina?',
          a: '¡Hola! Recomendamos lavado a mano con agua fría para mantener la curvatura de la visera intacta.',
          date: 'Hace 1 semana'
        }
      ]
    }
  ];

  // Estado global de la aplicación
  const state = {
    products: [],
    categories: ['Todas', 'Fútbol', 'Running', 'Training', 'Abrigo', 'Pantalones', 'Tops', 'Calzado', 'Accesorios'],
    selectedCategory: 'Todas',
    searchTerm: '',
    minPrice: null,
    maxPrice: null,
    freeShippingOnly: false,
    dealsOnly: false,
    selectedSize: null,
    selectedSport: null,
    sortBy: 'relevance',
    viewMode: 'grid',
    cart: {}, // { [id]: { qty, size, color, product } }
    favorites: new Set(),
    compareList: [], // array de hasta 3 productos
    activeDetailProduct: null,
    pendingQuestion: '',
    currentUser: null // null si es visitante sin sesion
  };

  // Helper selectors
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  // =========================================================================
  // PERSISTENCIA Y CARGA DE DATOS LOCALES & SUPABASE
  // =========================================================================

  function loadSavedState() {
    // Usuario
    try {
      const savedUser = localStorage.getItem('vantage_store_user');
      if (savedUser) state.currentUser = JSON.parse(savedUser);
    } catch (e) {
      state.currentUser = null;
    }

    // Carrito
    try {
      const savedCart = localStorage.getItem('vantage_store_cart');
      if (savedCart) state.cart = JSON.parse(savedCart);
    } catch (e) {
      state.cart = {};
    }

    // Favoritos
    try {
      const savedFavs = localStorage.getItem('vantage_store_favs');
      if (savedFavs) state.favorites = new Set(JSON.parse(savedFavs));
    } catch (e) {
      state.favorites = new Set();
    }

    // Preguntas adicionales persistidas
    try {
      const savedQuestions = localStorage.getItem('vantage_store_questions');
      if (savedQuestions) {
        const extraQuestions = JSON.parse(savedQuestions);
        Object.entries(extraQuestions).forEach(([prodId, qList]) => {
          const prod = DEFAULT_SPORTS_PRODUCTS.find(p => p.id === prodId);
          if (prod) {
            prod.questions = [...(prod.questions || []), ...qList];
          }
        });
      }
    } catch (e) {}
  }

  function saveCart() {
    try {
      localStorage.setItem('vantage_store_cart', JSON.stringify(state.cart));
    } catch (e) {}
    updateCartUI();
  }

  function saveFavorites() {
    try {
      localStorage.setItem('vantage_store_favs', JSON.stringify([...state.favorites]));
    } catch (e) {}
  }

  function saveUserSession(user) {
    state.currentUser = user;
    try {
      if (user) {
        localStorage.setItem('vantage_store_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('vantage_store_user');
      }
    } catch (e) {}
    updateAuthHeaderUI();
  }

  // Carga inicial y combinación con Supabase si existen productos
  async function initProducts() {
    let prods = [...DEFAULT_SPORTS_PRODUCTS];

    if (sbClient) {
      try {
        const { data: dbProducts, error } = await sbClient.from('producto').select('*');
        if (!error && Array.isArray(dbProducts) && dbProducts.length > 0) {
          console.log(`Cargados ${dbProducts.length} productos desde Supabase.`);
          // Adaptar productos del backend agregándoles imagen y estilo deportivo
          const adaptedDbProds = dbProducts.map((p, index) => {
            const defaultTemplate = DEFAULT_SPORTS_PRODUCTS[index % DEFAULT_SPORTS_PRODUCTS.length];
            return {
              id: String(p.id_producto || p.codigo || 'DB_' + index),
              title: p.nombre_producto || 'Prenda Vantage Pro',
              category: defaultTemplate.category,
              sport: defaultTemplate.sport,
              price: Number(p.precio_actual || 45.00),
              originalPrice: Number(p.precio_actual ? p.precio_actual * 1.35 : 65.00),
              discount: 25,
              rating: 4.8,
              reviewsCount: 85,
              soldCount: 310,
              image: defaultTemplate.image,
              images: defaultTemplate.images,
              badge: 'deal',
              badgeText: 'CATÁLOGO OFICIAL',
              isFull: true,
              freeShipping: Number(p.precio_actual) > 40,
              stock: 20,
              sizes: ['S', 'M', 'L', 'XL'],
              colors: ['#101411', '#d4ff3f'],
              material: 'Poliéster Deportivo Transpirable',
              technology: 'Dry-Comfort Shield',
              description: p.descripcion || defaultTemplate.description,
              questions: [...defaultTemplate.questions]
            };
          });
          // Unir evitando duplicados
          prods = [...adaptedDbProds, ...prods.filter(dp => !adaptedDbProds.some(ap => ap.id === dp.id))];
        }
      } catch (err) {
        console.warn('Usando catálogo deportivo predeterminado:', err);
      }
    }

    state.products = prods;
    renderCatalog();
    updateCartUI();
    updateCompareDock();
    updateAuthHeaderUI();
  }

  // =========================================================================
  // FILTRADO Y ORDENAMIENTO DE PRODUCTOS (TOLERANTE A ACENTOS)
  // =========================================================================

  function removeAccents(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function getFilteredProducts() {
    return state.products.filter(item => {
      // Búsqueda por término (tolerante a acentos y múltiples palabras)
      if (state.searchTerm) {
        const cleanTerm = removeAccents(state.searchTerm).trim();
        const fullContent = removeAccents(
          `${item.title} ${item.category} ${item.sport} ${item.description || ''} ${item.material || ''} ${item.technology || ''}`
        );

        const words = cleanTerm.split(/\s+/).filter(Boolean);
        const match = fullContent.includes(cleanTerm) ||
                      (words.length > 1 && words.every(w => fullContent.includes(w)));
        if (!match) return false;
      }

      // Categoría (tolerante a acentos)
      if (state.selectedCategory !== 'Todas') {
        if (removeAccents(item.category) !== removeAccents(state.selectedCategory)) return false;
      }

      // Deporte (tolerante a acentos)
      if (state.selectedSport) {
        if (removeAccents(item.sport) !== removeAccents(state.selectedSport)) return false;
      }

      // Precio mínimo
      if (state.minPrice !== null && item.price < state.minPrice) return false;

      // Precio máximo
      if (state.maxPrice !== null && item.price > state.maxPrice) return false;

      // Envío gratis
      if (state.freeShippingOnly && !item.freeShipping) return false;

      // Con descuento
      if (state.dealsOnly && (!item.discount || item.discount < 20)) return false;

      // Talla disponible
      if (state.selectedSize && (!item.sizes || !item.sizes.includes(state.selectedSize))) return false;

      return true;
    }).sort((a, b) => {
      if (state.sortBy === 'price-asc') return a.price - b.price;
      if (state.sortBy === 'price-desc') return b.price - a.price;
      if (state.sortBy === 'rating') return b.rating - a.rating;
      if (state.sortBy === 'discount') return (b.discount || 0) - (a.discount || 0);
      // 'relevance' (por ventas y rating)
      return (b.soldCount || 0) - (a.soldCount || 0);
    });
  }

  // =========================================================================
  // RENDERIZADO DEL CATÁLOGO (CARDS ESTILO MERCADO LIBRE)
  // =========================================================================

  function renderCatalog() {
    const grid = $('#productsGrid');
    if (!grid) return;

    const filtered = getFilteredProducts();

    // Actualizar conteo
    const resultsCountEl = $('#resultsCount');
    if (resultsCountEl) {
      resultsCountEl.textContent = `${filtered.length} productos`;
    }

    // Actualizar chips de filtros activos
    renderActiveFilterChips();

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--paper-white); border: 1px solid var(--line); border-radius: var(--radius-md);">
          <div style="font-size: 42px; margin-bottom: 12px;">🔍</div>
          <h3 style="font: 800 24px/1 var(--font-display); text-transform: uppercase; margin-bottom: 8px;">No encontramos publicaciones</h3>
          <p style="color: #7b8377; max-width: 440px; margin: 0 auto 18px; font-size: 13px;">
            No hay productos que coincidan con tus filtros actuales. Intenta modificar el término de búsqueda o limpia los filtros.
          </p>
          <button class="btn-price-apply" onclick="window.clearAllFilters()" style="padding: 8px 18px; font-size: 13px;">
            Limpiar todos los filtros
          </button>
        </div>
      `;
      return;
    }

    grid.className = `products-grid ${state.viewMode === 'list' ? 'list-view' : ''}`;

    grid.innerHTML = filtered.map(item => {
      const isFav = state.favorites.has(item.id);
      const isComparing = state.compareList.includes(item.id);
      const installmentsCount = 6;
      const installmentAmount = (item.price / installmentsCount).toFixed(2);

      return `
        <article class="product-card" data-id="${item.id}">
          <div class="card-media-wrap" onclick="window.openProductDetail('${item.id}')">
            <img class="card-img" src="${item.image}" alt="${item.title}" loading="lazy">
            <div class="card-badges">
              ${item.badgeText ? `<span class="badge-tag ${item.badge || 'deal'}">${item.badgeText}</span>` : ''}
              ${item.isFull ? `<span class="badge-tag full">FULL ⚡</span>` : ''}
            </div>
            <div class="card-top-actions" onclick="event.stopPropagation()">
              <button class="btn-card-action ${isFav ? 'active-fav' : ''}" 
                      onclick="window.toggleFavorite('${item.id}')" 
                      title="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                ${isFav ? '❤️' : '🤍'}
              </button>
              <button class="btn-card-action ${isComparing ? 'active-compare' : ''}" 
                      onclick="window.toggleCompare('${item.id}')" 
                      title="${isComparing ? 'Quitar de comparación' : 'Comparar producto'}">
                ⚖️
              </button>
            </div>
          </div>

          <div class="card-body">
            <div class="card-category-brand">
              <span>${item.category} • ${item.sport}</span>
              <span>VANTAGE ATHLETIC</span>
            </div>

            <h3 class="card-title" onclick="window.openProductDetail('${item.id}')" title="${item.title}">
              ${item.title}
            </h3>

            <div class="card-rating">
              <span class="stars-gold">★★★★★</span>
              <span style="font-weight: 700; color: #4a544a;">${item.rating}</span>
              <span class="reviews-count">(${item.reviewsCount})</span>
            </div>

            <div class="card-pricing">
              ${item.originalPrice ? `
                <div class="original-price-wrap">
                  <span class="price-strikethrough">$${item.originalPrice.toFixed(2)}</span>
                  <span class="discount-badge">${item.discount}% OFF</span>
                </div>
              ` : ''}
              <div class="current-price-row">
                <span class="price-currency">$</span>
                <span class="price-amount">${item.price.toFixed(2)}</span>
              </div>
              <div class="price-installments">
                en 6x <strong>$${installmentAmount}</strong> sin interés
              </div>
            </div>

            ${item.freeShipping ? `
              <div class="card-shipping">
                <span>⚡ Llega gratis mañana</span>
              </div>
            ` : `
              <div class="card-shipping" style="color: #6a7469;">
                <span>🚚 Envío a todo el país</span>
              </div>
            `}

            <div class="card-actions-row">
              <button class="btn-card-primary" onclick="window.openProductDetail('${item.id}')">
                Ver detalle
              </button>
              <button class="btn-card-cart" onclick="window.quickAddToCart('${item.id}')" title="Agregar al carrito">
                🛒
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderActiveFilterChips() {
    const container = $('#activeFilterChips');
    if (!container) return;

    const chips = [];

    if (state.selectedCategory !== 'Todas') {
      chips.push({ label: `Categoría: ${state.selectedCategory}`, action: () => window.filterByCategory('Todas') });
    }
    if (state.searchTerm) {
      chips.push({ label: `"${state.searchTerm}"`, action: () => window.clearSearch() });
    }
    if (state.minPrice !== null || state.maxPrice !== null) {
      const min = state.minPrice ? `$${state.minPrice}` : '$0';
      const max = state.maxPrice ? `$${state.maxPrice}` : '∞';
      chips.push({ label: `Precio: ${min} - ${max}`, action: () => window.clearPriceFilter() });
    }
    if (state.freeShippingOnly) {
      chips.push({ label: 'Envío Gratis', action: () => window.toggleFreeShipping(false) });
    }
    if (state.dealsOnly) {
      chips.push({ label: 'Ofertas relámpago', action: () => window.toggleDealsOnly(false) });
    }
    if (state.selectedSize) {
      chips.push({ label: `Talla: ${state.selectedSize}`, action: () => window.filterBySize(null) });
    }

    container.innerHTML = chips.map((c, i) => `
      <span class="filter-chip-pill">
        ${c.label}
        <span class="filter-chip-remove" onclick="window._chipActions[${i}]()">✕</span>
      </span>
    `).join('');

    window._chipActions = chips.map(c => c.action);
  }

  // =========================================================================
  // DETALLE DE PRODUCTO & PREGUNTAS AL VENDEDOR (REQUISITO CLAVE)
  // =========================================================================

  window.openProductDetail = function(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    state.activeDetailProduct = product;
    const modalRoot = $('#productDetailModalRoot');
    if (!modalRoot) return;

    const installments = (product.price / 6).toFixed(2);
    const questions = product.questions || [];

    modalRoot.innerHTML = `
      <div class="modal-backdrop open" id="detailBackdrop" onclick="window.closeProductDetail(event)">
        <div class="product-detail-modal" onclick="event.stopPropagation()">
          <div class="compare-modal-header">
            <div>
              <span style="font-size: 11px; font-weight: 800; color: var(--orange); letter-spacing: 1px;">VANTAGE PRO ATHLETIC</span>
              <h2>Detalle del Producto</h2>
            </div>
            <button class="modal-close-btn" onclick="window.closeProductDetail()">✕</button>
          </div>

          <div class="detail-modal-body">
            <div class="detail-top-breadcrumb">
              <span>Inicio</span> <span>›</span>
              <span>Ropa Deportiva</span> <span>›</span>
              <span>${product.category}</span> <span>›</span>
              <strong style="color: var(--ink);">${product.title}</strong>
            </div>

            <div class="detail-main-grid">
              <!-- Galería -->
              <div class="gallery-wrap">
                <div class="gallery-thumbs">
                  ${(product.images || [product.image]).map((img, i) => `
                    <div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="window.changeDetailMainImg('${img}', this)">
                      <img src="${img}" alt="Miniatura ${i}">
                    </div>
                  `).join('')}
                </div>
                <div class="gallery-featured">
                  <img id="detailMainFeaturedImg" src="${product.image}" alt="${product.title}">
                </div>
              </div>

              <!-- Info & Compra -->
              <div class="detail-info-col">
                <div class="detail-condition">
                  Nuevo | +${product.soldCount || 500} vendidos | Código: ${product.id}
                </div>

                <h1 class="detail-title">${product.title}</h1>

                <div class="detail-rating-row">
                  <span class="stars-gold">★★★★★</span>
                  <strong>${product.rating}</strong>
                  <span class="reviews-count">(${product.reviewsCount} opiniones de atletas)</span>
                </div>

                <div class="detail-pricing-box">
                  ${product.originalPrice ? `
                    <div class="original-price-wrap">
                      <span class="price-strikethrough">$${product.originalPrice.toFixed(2)}</span>
                      <span class="discount-badge">${product.discount}% OFF</span>
                    </div>
                  ` : ''}
                  <div class="current-price-row">
                    <span class="price-currency">$</span>
                    <span class="detail-price-big">${product.price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span class="detail-installments-badge">
                      en 6 cuotas de $${installments} sin interés
                    </span>
                  </div>
                </div>

                <!-- Selector de Color -->
                <div class="detail-options-group">
                  <div class="option-title">Color de edición:</div>
                  <div class="detail-color-list">
                    ${(product.colors || ['#101411', '#d4ff3f']).map((col, idx) => `
                      <div class="color-swatch ${idx === 0 ? 'active' : ''}" 
                           style="background: ${col};" 
                           onclick="window.selectDetailColor('${col}', this)"></div>
                    `).join('')}
                  </div>
                </div>

                <!-- Selector de Tallas -->
                <div class="detail-options-group">
                  <div class="option-title">
                    <span>Seleccionar Talla:</span>
                    <span class="size-guide-link" onclick="window.openSizeGuide()">📏 Guía de tallas</span>
                  </div>
                  <div class="detail-size-list" id="detailSizesWrap">
                    ${(product.sizes || ['S', 'M', 'L', 'XL']).map((s, idx) => `
                      <button class="detail-size-btn ${idx === 0 ? 'active' : ''}" 
                              onclick="window.selectDetailSize('${s}', this)">
                        ${s}
                      </button>
                    `).join('')}
                  </div>
                </div>

                <div class="stock-status-row">
                  <span class="stock-dot"></span>
                  <span>Stock disponible: <strong>${product.stock || 12} unidades</strong></span>
                </div>

                <div class="detail-buy-actions">
                  <button class="btn-detail-buy-now" onclick="window.detailBuyNow('${product.id}')">
                    Comprar ahora
                  </button>
                  <button class="btn-detail-add-cart" onclick="window.detailAddToCart('${product.id}')">
                    Agregar al carrito
                  </button>
                </div>

                <!-- Respaldo y Vendedor -->
                <div class="seller-trust-card">
                  <div class="seller-row">
                    <span>Vendido por <strong>Vantage Official Store</strong></span>
                    <span class="seller-badge-platinum">⚡ MercadoLíder Platinum</span>
                  </div>
                  <div>🛡️ <strong>Garantía oficial Vantage:</strong> 30 días de cambio o devolución gratis sin costo.</div>
                  <div>🚚 <strong>Despacho Express:</strong> Recíbelo mañana en tu domicilio con empaque seguro.</div>
                </div>
              </div>
            </div>

            <!-- Ficha Técnica -->
            <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--line);">
              <h3 style="font: 800 24px/1 var(--font-display); text-transform: uppercase; margin-bottom: 14px;">
                Características & Especificaciones
              </h3>
              <p style="color: #4a544a; line-height: 1.7; margin-bottom: 18px; font-size: 14px;">
                ${product.description}
              </p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; background: #f8f9f5; padding: 18px; border-radius: var(--radius-md);">
                <div><strong>Disciplina:</strong> ${product.sport}</div>
                <div><strong>Tecnología:</strong> ${product.technology || 'AeroShield'}</div>
                <div><strong>Composición:</strong> ${product.material || 'Poliéster técnico'}</div>
                <div><strong>Corte:</strong> Regular Athletic Fit</div>
              </div>
            </div>

            <!-- ============================================================= -->
            <!-- SECCIÓN DE PREGUNTAS Y RESPUESTAS (MERCADO LIBRE STYLE)        -->
            <!-- ============================================================= -->
            <div class="detail-qa-section" id="qaSection">
              <div class="qa-section-header">
                <h3>Preguntas y Respuestas al Vendedor</h3>
                <p>Hazle una pregunta sobre tallas, envíos o especificaciones al equipo oficial de Vantage.</p>
              </div>

              <!-- Formulario de pregunta -->
              <div class="ask-seller-box">
                <div class="ask-seller-form">
                  <input type="text" 
                         id="askQuestionInput" 
                         class="ask-seller-input" 
                         placeholder="Escribe tu pregunta para el vendedor..." 
                         onkeydown="if(event.key==='Enter') window.submitQuestion('${product.id}')">
                  <button class="btn-submit-question" onclick="window.submitQuestion('${product.id}')">
                    Preguntar
                  </button>
                </div>

                <div class="qa-quick-chips">
                  <span style="font-size: 11px; font-weight: 700; color: #7b8377; align-self: center;">Sugerencias:</span>
                  <button class="qa-chip-btn" onclick="window.setQuickQuestion('¿Tienen stock en talla L para entrega inmediata?')">
                    ¿Tienen stock en talla L?
                  </button>
                  <button class="qa-chip-btn" onclick="window.setQuickQuestion('¿El calce es holgado o ajustado?')">
                    ¿El calce es holgado o ajustado?
                  </button>
                  <button class="qa-chip-btn" onclick="window.setQuickQuestion('¿Hacen envíos a regiones por Chilexpress / Starken?')">
                    ¿Hacen envíos a regiones?
                  </button>
                  <button class="qa-chip-btn" onclick="window.setQuickQuestion('¿Es 100% original con garantía de fábrica?')">
                    ¿Tiene garantía oficial?
                  </button>
                </div>

                <!-- Notificación para visitantes no logueados -->
                ${!state.currentUser ? `
                  <div class="guest-qa-notice">
                    <span class="notice-icon">🔒</span>
                    <div>
                      <strong>Estás navegando en modo visitante.</strong> Para enviar una pregunta y recibir notificaciones cuando el vendedor responda, deberás iniciar sesión.
                    </div>
                    <button class="btn-login-to-ask" onclick="window.openAuthModal('Preguntar al vendedor')">
                      Iniciar sesión
                    </button>
                  </div>
                ` : `
                  <div style="margin-top: 10px; font-size: 12px; color: #555e54; display: flex; align-items: center; gap: 6px;">
                    <span>👤 Preguntando como: <strong>${state.currentUser.name}</strong></span>
                  </div>
                `}
              </div>

              <!-- Lista de preguntas existentes -->
              <div class="qa-questions-list" id="qaQuestionsList">
                ${renderQuestionsList(questions)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  function renderQuestionsList(questions) {
    if (!questions || questions.length === 0) {
      return `
        <div style="text-align: center; padding: 24px; color: #8c9388; font-size: 13px;">
          Nadie ha preguntado sobre este producto aún. ¡Sé el primero en consultar!
        </div>
      `;
    }

    return questions.map(item => `
      <div class="qa-item">
        <div class="qa-question-row">
          <span class="qa-q-mark">?</span>
          <span>${item.q}</span>
          <span class="qa-date">${item.date || 'Reciente'}</span>
        </div>
        ${item.a ? `
          <div class="qa-answer-row">
            <div>
              <span class="seller-official-tag">VANTAGE OFFICIAL STORE</span>
              <span>${item.a}</span>
            </div>
          </div>
        ` : `
          <div class="qa-answer-row" style="color: var(--orange);">
            <span>⏳ Esperando respuesta del vendedor...</span>
          </div>
        `}
      </div>
    `).join('');
  }

  window.closeProductDetail = function(event) {
    if (event && event.target && !event.target.classList.contains('modal-backdrop') && !event.target.classList.contains('modal-close-btn')) {
      return;
    }
    const modalRoot = $('#productDetailModalRoot');
    if (modalRoot) modalRoot.innerHTML = '';
    state.activeDetailProduct = null;
  };

  window.changeDetailMainImg = function(src, thumbEl) {
    const mainImg = $('#detailMainFeaturedImg');
    if (mainImg) mainImg.src = src;
    $$('.gallery-thumb').forEach(el => el.classList.remove('active'));
    if (thumbEl) thumbEl.classList.add('active');
  };

  window.selectDetailSize = function(size, btnEl) {
    $$('#detailSizesWrap .detail-size-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    btnEl.dataset.selectedSize = size;
  };

  window.selectDetailColor = function(color, swatchEl) {
    $$('.color-swatch').forEach(s => s.classList.remove('active'));
    if (swatchEl) swatchEl.classList.add('active');
  };

  window.setQuickQuestion = function(text) {
    const input = $('#askQuestionInput');
    if (input) {
      input.value = text;
      input.focus();
    }
  };

  // =========================================================================
  // ENVÍO DE PREGUNTAS CON VALIDACIÓN DE SESIÓN (REQUISITO ESPECIFICADO)
  // =========================================================================

  window.submitQuestion = function(productId) {
    const input = $('#askQuestionInput');
    if (!input) return;

    const questionText = input.value.trim();
    if (!questionText) {
      showToast('Por favor escribe tu pregunta antes de enviar.', 'error');
      input.focus();
      return;
    }

    // SI NO HA INICIADO SESIÓN: DETENER Y PEDIR INICIO DE SESIÓN (ESTILO MERCADO LIBRE)
    if (!state.currentUser) {
      state.pendingQuestion = questionText;
      window.openAuthModal('Preguntar al vendedor');
      return;
    }

    // SI YA ESTÁ AUTENTICADO: PROCEDER A PUBLICAR LA PREGUNTA
    postQuestion(productId, questionText);
    input.value = '';
  };

  function postQuestion(productId, text) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    if (!product.questions) product.questions = [];

    const newQuestion = {
      q: text,
      a: null, // Pendiente de respuesta
      date: 'Hace un momento',
      author: state.currentUser ? state.currentUser.name : 'Usuario'
    };

    product.questions.unshift(newQuestion);

    // Guardar en localStorage para persistencia
    try {
      const saved = JSON.parse(localStorage.getItem('vantage_store_questions') || '{}');
      if (!saved[productId]) saved[productId] = [];
      saved[productId].unshift(newQuestion);
      localStorage.setItem('vantage_store_questions', JSON.stringify(saved));
    } catch (e) {}

    // Actualizar vista de preguntas
    const listEl = $('#qaQuestionsList');
    if (listEl) {
      listEl.innerHTML = renderQuestionsList(product.questions);
    }

    showToast('¡Pregunta enviada al vendedor! Te notificaremos la respuesta.', 'success');

    // Simular respuesta rápida oficial del vendedor tras 2.5 segundos para demostración
    setTimeout(() => {
      newQuestion.a = `¡Hola ${state.currentUser.name}! Gracias por consultar. Sí, tenemos disponibilidad y despachamos dentro de las próximas 24 horas hábiles con garantía Vantage.`;
      if (listEl) {
        listEl.innerHTML = renderQuestionsList(product.questions);
      }
      showToast('⚡ Vantage Official Store respondió a tu pregunta.', 'success');
    }, 2800);
  }

  // =========================================================================
  // MODAL DE AUTENTICACIÓN / LOGIN PARA CLIENTES
  // =========================================================================

  window.openAuthModal = function(reason = 'Acceder a tu cuenta') {
    const modalRoot = $('#authModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-backdrop open" id="authBackdrop" onclick="window.closeAuthModal(event)">
        <div class="auth-modal-box" onclick="event.stopPropagation()">
          <div class="auth-modal-header">
            <button class="modal-close-btn" style="position: absolute; right: 18px; top: 18px;" onclick="window.closeAuthModal()">✕</button>
            <div class="auth-lock-icon">🔒</div>
            <h2>Inicia sesión para continuar</h2>
            <p>Para ${reason.toLowerCase()} y recibir notificaciones oficiales en tu casillero, ingresa a tu cuenta Vantage.</p>
          </div>

          <div class="auth-modal-content">
            <div class="auth-preview-alert">
              <span>ℹ️</span>
              <div>
                <strong>Próximamente: Integración de Cuentas Oficiales.</strong><br>
                El inicio de sesión con backend se habilitará pronto. Mientras tanto, puedes ingresar con el <strong>Modo Cliente Demo</strong> para probar el flujo de preguntas y compras al instante.
              </div>
            </div>

            <form onsubmit="window.handleAuthSubmit(event)">
              <div class="auth-form-group">
                <label for="authEmailInput">Correo Electrónico</label>
                <input type="email" id="authEmailInput" class="auth-input" placeholder="tu.email@ejemplo.com" value="cliente.vantage@gmail.com" required>
              </div>

              <div class="auth-form-group">
                <label for="authPassInput">Contraseña</label>
                <input type="password" id="authPassInput" class="auth-input" placeholder="••••••••" value="deportes2026" required>
              </div>

              <button type="submit" class="btn-auth-submit">
                Ingresar a Vantage
              </button>
            </form>

            <div class="auth-divider">O también</div>

            <button type="button" class="btn-demo-login" onclick="window.loginAsDemoUser()">
              <span>⚡</span>
              <span>Continuar con 1 Clic como "Atleta Demo"</span>
            </button>
          </div>
        </div>
      </div>
    `;
  };

  window.closeAuthModal = function(event) {
    if (event && event.target && !event.target.classList.contains('modal-backdrop') && !event.target.classList.contains('modal-close-btn')) {
      return;
    }
    const modalRoot = $('#authModalRoot');
    if (modalRoot) modalRoot.innerHTML = '';
  };

  window.handleAuthSubmit = function(e) {
    e.preventDefault();
    const email = $('#authEmailInput')?.value.trim() || 'cliente@vantage.com';
    const name = email.split('@')[0].replace(/[._]/g, ' ').toUpperCase();

    saveUserSession({
      name: name,
      email: email,
      avatar: name.slice(0, 2)
    });

    window.closeAuthModal();
    showToast(`¡Bienvenido de vuelta, ${name}! Sesión iniciada.`, 'success');

    // Si había una pregunta pendiente, enviarla automáticamente
    if (state.pendingQuestion && state.activeDetailProduct) {
      postQuestion(state.activeDetailProduct.id, state.pendingQuestion);
      state.pendingQuestion = '';
      const input = $('#askQuestionInput');
      if (input) input.value = '';
    }
  };

  window.loginAsDemoUser = function() {
    saveUserSession({
      name: 'Carlos Atleta Pro',
      email: 'carlos.atleta@vantage.com',
      avatar: 'CA'
    });

    window.closeAuthModal();
    showToast('Sesión de prueba activada como "Carlos Atleta Pro".', 'success');

    // Si había una pregunta pendiente, enviarla automáticamente
    if (state.pendingQuestion && state.activeDetailProduct) {
      postQuestion(state.activeDetailProduct.id, state.pendingQuestion);
      state.pendingQuestion = '';
      const input = $('#askQuestionInput');
      if (input) input.value = '';
    }
  };

  window.logoutUser = function() {
    saveUserSession(null);
    showToast('Sesión cerrada. Ahora estás navegando como visitante.', 'info');
    if (state.activeDetailProduct) {
      window.openProductDetail(state.activeDetailProduct.id);
    }
  };

  function updateAuthHeaderUI() {
    const userWrap = $('#headerUserAuthWrap');
    if (!userWrap) return;

    if (state.currentUser) {
      userWrap.innerHTML = `
        <div class="user-auth-pill" title="Sesión activa: ${state.currentUser.email}" onclick="window.logoutUser()">
          <div class="user-pill-avatar">${state.currentUser.avatar || 'US'}</div>
          <span><strong>${state.currentUser.name}</strong> (Salir)</span>
        </div>
      `;
    } else {
      userWrap.innerHTML = `
        <div class="user-auth-pill" onclick="window.openAuthModal('Ingresar')">
          <span>👤 Iniciar sesión / Registro</span>
        </div>
      `;
    }
  }

  // =========================================================================
  // COMPARADOR DE PRODUCTOS (CARA A CARA)
  // =========================================================================

  window.toggleCompare = function(productId) {
    const index = state.compareList.indexOf(productId);
    if (index > -1) {
      state.compareList.splice(index, 1);
      showToast('Producto removido del comparador.', 'info');
    } else {
      if (state.compareList.length >= 3) {
        showToast('Puedes comparar un máximo de 3 productos al mismo tiempo.', 'error');
        return;
      }
      state.compareList.push(productId);
      showToast('Producto agregado al comparador.', 'success');
    }

    updateCompareDock();
    renderCatalog();
  };

  function updateCompareDock() {
    const dock = $('#compareDock');
    const countEl = $('#compareDockCount');
    const itemsEl = $('#compareDockItems');
    const topCount = $('#topCompareCount');

    if (topCount) topCount.textContent = state.compareList.length;

    if (!dock) return;

    if (state.compareList.length > 0) {
      dock.classList.add('visible');
      if (countEl) countEl.textContent = state.compareList.length;

      if (itemsEl) {
        itemsEl.innerHTML = state.compareList.map(id => {
          const p = state.products.find(item => item.id === id);
          if (!p) return '';
          return `<img class="compare-dock-thumb" src="${p.image}" alt="${p.title}" title="${p.title}">`;
        }).join('');
      }
    } else {
      dock.classList.remove('visible');
    }
  }

  window.clearCompare = function() {
    state.compareList = [];
    updateCompareDock();
    renderCatalog();
    showToast('Comparador limpiado.', 'info');
  };

  window.openCompareModal = function() {
    if (state.compareList.length === 0) {
      showToast('Selecciona al menos 1 producto con el icono ⚖️ para comparar.', 'info');
      return;
    }

    const modalRoot = $('#compareModalRoot');
    if (!modalRoot) return;

    const items = state.compareList.map(id => state.products.find(p => p.id === id)).filter(Boolean);

    modalRoot.innerHTML = `
      <div class="modal-backdrop open" id="compareBackdrop" onclick="window.closeCompareModal(event)">
        <div class="compare-modal-box" onclick="event.stopPropagation()">
          <div class="compare-modal-header">
            <div>
              <span style="font-size: 11px; font-weight: 800; color: var(--lime-deep); letter-spacing: 1px;">COMPARADOR DE PRENDAS</span>
              <h2>Comparativa Técnica de Productos</h2>
            </div>
            <button class="modal-close-btn" onclick="window.closeCompareModal()">✕</button>
          </div>

          <div style="padding: 20px; overflow-x: auto;">
            <table class="compare-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  ${items.map(item => `
                    <td class="compare-product-col">
                      <div class="compare-col-header">
                        <img class="compare-col-img" src="${item.image}" alt="${item.title}">
                        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${item.title}</div>
                        <div style="font: 800 22px/1 var(--font-display); color: var(--ink);">$${item.price.toFixed(2)}</div>
                        <button class="btn-card-primary" style="margin-top: 10px; width: 100%;" onclick="window.quickAddToCart('${item.id}')">
                          Agregar al carrito
                        </button>
                      </div>
                    </td>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Disciplina / Deporte</th>
                  ${items.map(item => `<td><strong>${item.sport}</strong> (${item.category})</td>`).join('')}
                </tr>
                <tr>
                  <th>Descuento</th>
                  ${items.map(item => `<td><span class="discount-badge">${item.discount || 0}% OFF</span></td>`).join('')}
                </tr>
                <tr>
                  <th>Tecnología Textil</th>
                  ${items.map(item => `<td>${item.technology || 'AeroWeave'}</td>`).join('')}
                </tr>
                <tr>
                  <th>Material</th>
                  ${items.map(item => `<td>${item.material || 'Poliéster técnico'}</td>`).join('')}
                </tr>
                <tr>
                  <th>Tallas Disponibles</th>
                  ${items.map(item => `<td>${(item.sizes || []).join(', ')}</td>`).join('')}
                </tr>
                <tr>
                  <th>Tipo de Envío</th>
                  ${items.map(item => `<td>${item.freeShipping ? '⚡ Gratis en 24h' : 'Estándar'}</td>`).join('')}
                </tr>
                <tr>
                  <th>Calificación</th>
                  ${items.map(item => `<td>★ ${item.rating} (${item.reviewsCount} opiniones)</td>`).join('')}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  };

  window.closeCompareModal = function(event) {
    if (event && event.target && !event.target.classList.contains('modal-backdrop') && !event.target.classList.contains('modal-close-btn')) {
      return;
    }
    const modalRoot = $('#compareModalRoot');
    if (modalRoot) modalRoot.innerHTML = '';
  };

  // =========================================================================
  // CARRITO DE COMPRAS & CHECKOUT
  // =========================================================================

  window.quickAddToCart = function(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const defaultSize = (product.sizes && product.sizes[0]) || 'M';
    const defaultColor = (product.colors && product.colors[0]) || '#101411';

    addToCart(product, defaultSize, defaultColor, 1);
  };

  window.detailAddToCart = function(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const selectedSizeEl = $('#detailSizesWrap .detail-size-btn.active');
    const selectedSize = selectedSizeEl ? selectedSizeEl.textContent.trim() : (product.sizes[0] || 'M');
    const selectedColor = product.colors ? product.colors[0] : '#101411';

    addToCart(product, selectedSize, selectedColor, 1);
    window.closeProductDetail();
  };

  window.detailBuyNow = function(productId) {
    window.detailAddToCart(productId);
    window.openCartDrawer();
  };

  function addToCart(product, size, color, qty = 1) {
    const key = `${product.id}_${size}_${color}`;
    if (state.cart[key]) {
      state.cart[key].qty += qty;
    } else {
      state.cart[key] = {
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        size: size,
        color: color,
        qty: qty
      };
    }
    saveCart();
    showToast(`"${product.title}" agregado al carrito.`, 'success');
  }

  window.updateCartQty = function(key, delta) {
    if (!state.cart[key]) return;
    state.cart[key].qty += delta;
    if (state.cart[key].qty <= 0) {
      delete state.cart[key];
    }
    saveCart();
  };

  window.removeCartItem = function(key) {
    delete state.cart[key];
    saveCart();
    showToast('Producto eliminado del carrito.', 'info');
  };

  function updateCartUI() {
    const countEl = $('#cartHeaderCount');
    const drawerList = $('#cartDrawerItems');
    const drawerSubtotal = $('#cartDrawerSubtotal');
    const drawerTotal = $('#cartDrawerTotal');

    const items = Object.entries(state.cart);
    const totalCount = items.reduce((acc, [, item]) => acc + item.qty, 0);
    const subtotal = items.reduce((acc, [, item]) => acc + (item.price * item.qty), 0);

    if (countEl) countEl.textContent = totalCount;

    if (drawerSubtotal) drawerSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    if (drawerTotal) drawerTotal.textContent = `$${subtotal.toFixed(2)}`;

    if (drawerList) {
      if (items.length === 0) {
        drawerList.innerHTML = `
          <div class="cart-empty-message">
            <div class="cart-empty-icon">🛒</div>
            <p><strong>Tu carrito está vacío</strong></p>
            <p style="font-size: 12px; margin-top: 6px;">Descubre las prendas deportivas en oferta y súmalas a tu entrenamiento.</p>
          </div>
        `;
      } else {
        drawerList.innerHTML = items.map(([key, item]) => `
          <div class="cart-item-row">
            <img class="cart-item-img" src="${item.image}" alt="${item.title}">
            <div class="cart-item-info">
              <div class="cart-item-title">${item.title}</div>
              <div class="cart-item-meta">Talla: <strong>${item.size}</strong></div>
              <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
            </div>
            <div class="cart-qty-ctrls">
              <button class="cart-qty-btn" onclick="window.updateCartQty('${key}', -1)">-</button>
              <span class="cart-qty-val">${item.qty}</span>
              <button class="cart-qty-btn" onclick="window.updateCartQty('${key}', 1)">+</button>
            </div>
            <button class="cart-item-del" onclick="window.removeCartItem('${key}')" title="Eliminar">✕</button>
          </div>
        `).join('');
      }
    }
  }

  window.openCartDrawer = function() {
    const overlay = $('#cartDrawerOverlay');
    if (overlay) overlay.classList.add('open');
  };

  window.closeCartDrawer = function(event) {
    if (event && event.target && !event.target.classList.contains('cart-drawer-overlay') && !event.target.classList.contains('modal-close-btn')) {
      return;
    }
    const overlay = $('#cartDrawerOverlay');
    if (overlay) overlay.classList.remove('open');
  };

  window.checkoutCart = function() {
    const items = Object.values(state.cart);
    if (items.length === 0) {
      showToast('Tu carrito está vacío. Agrega prendas para continuar.', 'error');
      return;
    }

    if (!state.currentUser) {
      window.closeCartDrawer();
      window.openAuthModal('Completar tu pedido');
      return;
    }

    const total = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    showToast(`¡Pedido de $${total.toFixed(2)} recibido! Procesando envío a nombre de ${state.currentUser.name}.`, 'success');
    state.cart = {};
    saveCart();
    window.closeCartDrawer();
  };

  // =========================================================================
  // CONTROL DE FILTROS & BÚSQUEDA
  // =========================================================================

  window.filterByCategory = function(category) {
    state.selectedCategory = category;
    $$('.cat-nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.category === category);
    });
    $$('.cat-filter-item').forEach(item => {
      item.classList.toggle('active', item.dataset.category === category);
    });
    renderCatalog();
  };

  window.filterBySize = function(size) {
    state.selectedSize = state.selectedSize === size ? null : size;
    $$('.size-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.size === state.selectedSize);
    });
    renderCatalog();
  };

  window.applyPriceFilter = function() {
    const minInput = $('#priceMinInput');
    const maxInput = $('#priceMaxInput');

    const min = minInput && minInput.value ? parseFloat(minInput.value) : null;
    const max = maxInput && maxInput.value ? parseFloat(maxInput.value) : null;

    state.minPrice = min;
    state.maxPrice = max;
    renderCatalog();
  };

  window.setPricePreset = function(min, max) {
    const minInput = $('#priceMinInput');
    const maxInput = $('#priceMaxInput');
    if (minInput) minInput.value = min || '';
    if (maxInput) maxInput.value = max || '';
    state.minPrice = min;
    state.maxPrice = max;
    renderCatalog();
  };

  window.clearPriceFilter = function() {
    const minInput = $('#priceMinInput');
    const maxInput = $('#priceMaxInput');
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';
    state.minPrice = null;
    state.maxPrice = null;
    renderCatalog();
  };

  window.toggleFreeShipping = function(checked) {
    state.freeShippingOnly = checked;
    const chk = $('#freeShippingCheckbox');
    if (chk) chk.checked = checked;
    renderCatalog();
  };

  window.toggleDealsOnly = function(checked) {
    state.dealsOnly = checked;
    const chk = $('#dealsCheckbox');
    if (chk) chk.checked = checked;
    renderCatalog();
  };

  window.clearSearch = function() {
    state.searchTerm = '';
    const input = $('#searchInput');
    const clearBtn = $('#searchClearBtn');
    if (input) input.value = '';
    if (clearBtn) clearBtn.classList.remove('visible');
    renderCatalog();
  };

  window.clearAllFilters = function() {
    state.selectedCategory = 'Todas';
    state.searchTerm = '';
    state.minPrice = null;
    state.maxPrice = null;
    state.freeShippingOnly = false;
    state.dealsOnly = false;
    state.selectedSize = null;
    state.selectedSport = null;

    const sInput = $('#searchInput');
    if (sInput) sInput.value = '';

    const pMin = $('#priceMinInput');
    const pMax = $('#priceMaxInput');
    if (pMin) pMin.value = '';
    if (pMax) pMax.value = '';

    const fShip = $('#freeShippingCheckbox');
    if (fShip) fShip.checked = false;

    const dDeal = $('#dealsCheckbox');
    if (dDeal) dDeal.checked = false;

    $$('.cat-nav-link').forEach(l => l.classList.remove('active'));
    $$('.cat-filter-item').forEach(l => l.classList.remove('active'));
    $$('.size-chip').forEach(c => c.classList.remove('active'));

    renderCatalog();
    showToast('Filtros restablecidos.', 'info');
  };

  window.setSortBy = function(val) {
    state.sortBy = val;
    renderCatalog();
  };

  window.setViewMode = function(mode) {
    state.viewMode = mode;
    $$('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    renderCatalog();
  };

  window.toggleFavorite = function(productId) {
    if (state.favorites.has(productId)) {
      state.favorites.delete(productId);
      showToast('Eliminado de favoritos.', 'info');
    } else {
      state.favorites.add(productId);
      showToast('Agregado a favoritos.', 'success');
    }
    saveFavorites();
    renderCatalog();
  };

  window.openSizeGuide = function() {
    alert('Guía de Tallas Vantage:\n• S: Pecho 88-96 cm / Cintura 73-81 cm\n• M: Pecho 96-104 cm / Cintura 81-89 cm\n• L: Pecho 104-112 cm / Cintura 89-97 cm\n• XL: Pecho 112-124 cm / Cintura 97-109 cm');
  };

  // Toast System
  function showToast(message, type = 'success') {
    const container = $('#toastRegion');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `
      <span>${type === 'error' ? '⚠️' : type === 'info' ? 'ℹ️' : '✔'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // =========================================================================
  // BÚSQUEDA Y SUGERENCIAS RÁPIDAS
  // =========================================================================

  function initSearchEvents() {
    const input = $('#searchInput');
    const clearBtn = $('#searchClearBtn');
    const suggestionsBox = $('#searchSuggestions');

    if (input) {
      input.addEventListener('input', (e) => {
        state.searchTerm = e.target.value.trim();
        if (clearBtn) {
          clearBtn.classList.toggle('visible', state.searchTerm.length > 0);
        }
        renderCatalog();
      });

      input.addEventListener('focus', () => {
        if (suggestionsBox) suggestionsBox.classList.add('active');
      });

      input.addEventListener('blur', () => {
        setTimeout(() => {
          if (suggestionsBox) suggestionsBox.classList.remove('active');
        }, 220);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        window.clearSearch();
      });
    }

    $$('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const query = item.dataset.query;
        if (input) input.value = query;
        state.searchTerm = query;
        if (clearBtn) clearBtn.classList.add('visible');
        renderCatalog();
      });
    });
  }

  // =========================================================================
  // INICIALIZACIÓN AL CARGAR LA PÁGINA
  // =========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    loadSavedState();
    initSearchEvents();
    initProducts();
  });

})();
