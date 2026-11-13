/* =========================================================================
   ARCHIVO: script.js
   Organizado en 8 bloques:
   0. Carga de secciones (fetch de /sections/*.html) + configuración de
      qué secciones y proyectos se muestran
   0b. Aplicar visibilidad y etiquetas de estado (dentro de initApp)
   1. Colores de canal
   2. Navegación entre escenas (goTo)
   3. Lista → detalle dentro de cada sección de proyectos
   4. Texto que rota en 3D, letra por letra (hero)
   5. Estela de luz que sigue al mouse (fondo)
   6. Banner interactivo de título (el mouse revela color dentro del texto)
   7. Galería de clips de video + visor ampliado
   8. Video principal de ficha (portada, botón de play, duración)

   Los bloques 1-6 dependen de que las escenas ya estén en el DOM, así que
   viven dentro de la función initApp(), que se ejecuta recién después de
   que el bloque 0 termina de insertar todos los archivos de /sections/.
========================================================================= */

/* ---------- 0. CARGA DE SECCIONES ----------
   Cada escena (Inicio, Sobre mí, Experiencias interactivas, etc.) es un
   archivo HTML separado dentro de /sections/. Esta lista define, en
   orden, qué archivo corresponde a cada id de escena — el mismo id que
   usan los botones del <nav> en su atributo data-target.

   visible: false -> la sección NO se carga, y su botón del nav, su
   etiqueta de canal en Inicio y cualquier botón data-goto que apunte a
   ella desaparecen. Cambialo a true para publicarla. */
const SECTION_FILES = [
  { id: 'inicio',                    file: 'sections/inicio.html',                    visible: true  },
  { id: 'sobre-mi',                  file: 'sections/sobre-mi.html',                  visible: true  },
  { id: 'experiencias-interactivas', file: 'sections/experiencias-interactivas.html', visible: true  },
  { id: 'apps-web',                  file: 'sections/apps-web.html',                  visible: true  },
  { id: 'hardware',                  file: 'sections/hardware.html',                  visible: false },
  { id: 'visual-3d',                 file: 'sections/visual-3d.html',                 visible: true  },
  { id: 'contacto',                  file: 'sections/contacto.html',                  visible: true  },
];

/* PROYECTOS: configuración por ficha, usando el id del .project-detail.
   Solo hace falta listar los proyectos que tengan algo especial:
     visible: false        -> la fila de la lista y la ficha se eliminan.
     status: 'En desarrollo' -> agrega esa etiqueta (estilo .chip) en la
                              fila de la lista y en la ficha.
   Los proyectos que no aparecen acá se muestran normal, sin etiqueta. */
const PROJECTS = {
  'ei-orchestrion': { visible: false },
  'aw-umng-path':   { status: 'En desarrollo' },
  // Sin contenido todavía: ocultos hasta que tengan textos e imágenes
  'pv-new3d':       { visible: false },
  'il-new1':        { visible: false },
  'il-new2':        { visible: false },
};

/* loadSections(): pide (fetch) cada archivo de la lista de arriba, uno
   por uno, y va agregando su HTML dentro de #scenesContainer en el
   mismo orden. Si algo falla (por ejemplo, abriste el archivo con doble
   clic en vez de usar un servidor local — ver el comentario en
   index.html), muestra un aviso en vez de dejar la página en blanco. */
async function loadSections(){
  const container = document.getElementById('scenesContainer');
  try{
    for(const section of SECTION_FILES){
      if(!section.visible) continue; // secciones ocultas: ni se cargan
      const response = await fetch(section.file);
      if(!response.ok) throw new Error('No se pudo cargar ' + section.file);
      const html = deferMedia(await response.text());
      container.insertAdjacentHTML('beforeend', html);
    }
  } catch(err){
    container.innerHTML =
      '<section class="scene active" style="display:flex;align-items:center;justify-content:center;padding:64px;">' +
      '<p style="max-width:50ch;">No se pudieron cargar las secciones (' + err.message + '). ' +
      'Este sitio necesita abrirse desde un servidor local o un hosting real — no funciona abriendo el archivo con doble clic. ' +
      'Mirá el comentario al principio de index.html para más detalle.</p>' +
      '</section>';
    console.error(err);
  }
}

/* deferMedia(html): antes de insertar una sección, cambia src= y poster=
   de sus <img>, <video> e <iframe> por data-src= / data-poster=. Así el
   navegador NO descarga nada al abrir la página: cada archivo se pide
   recién cuando hace falta (ver "CARGA DIFERIDA" dentro de initApp). */
function deferMedia(html){
  return html.replace(/<(?:img|video|iframe)\b[^>]*>/g,
    tag => tag.replace(/\s(src|poster)=/g, ' data-$1='));
}

/* Arranca todo: primero carga las secciones, y cuando termina, inicializa
   el resto de la interacción (que necesita que esas secciones ya existan
   en el DOM). */
loadSections().then(initApp);


/* =========================================================================
   initApp() agrupa los bloques 1-6. Se llama una sola vez, después de
   loadSections().
========================================================================= */
function initApp(){

  /* ---------- 0b. VISIBILIDAD Y ETIQUETAS DE ESTADO ----------
     Va primero, antes de que el resto del código lea el nav, las escenas
     y las listas de proyectos. Usa SECTION_FILES y PROJECTS (arriba). */
  SECTION_FILES.filter(s=> !s.visible).forEach(s=>{
    document.querySelectorAll(
      '.nav-item[data-target="'+s.id+'"], [data-section="'+s.id+'"], [data-goto="'+s.id+'"]'
    ).forEach(el=> el.remove());
  });

  Object.entries(PROJECTS).forEach(([projectId, cfg])=>{
    const rows = document.querySelectorAll('.work-item[data-target="'+projectId+'"]');
    const detail = document.getElementById(projectId);

    if(cfg.visible === false){
      rows.forEach(el=> el.remove());
      if(detail) detail.remove();
      return;
    }

    if(cfg.status){
      const makeTag = ()=>{
        const tag = document.createElement('span');
        tag.className = 'chip';
        tag.textContent = cfg.status;
        return tag;
      };
      rows.forEach(row=> row.insertBefore(makeTag(), row.querySelector('.wi-arrow')));
      // En la ficha: primera etiqueta de la fila de tecnologías (.chips);
      // si la ficha no tiene esa fila, va al lado del título.
      const chips = detail ? detail.querySelector('.chips') : null;
      const title = detail ? detail.querySelector('.detail-head h3') : null;
      if(chips) chips.prepend(makeTag());
      else if(title) title.after(makeTag());
    }
  });

  /* ---------- 1. COLORES DE CANAL ----------
     Lee los valores hex definidos en :root (style.css) para poder
     usarlos desde JS: tanto para pintar el nav/HUD como para el canvas
     de la estela y el banner de título. */
  const colors = {
    neutral: getComputedStyle(document.documentElement).getPropertyValue('--neutral').trim(),
    red: getComputedStyle(document.documentElement).getPropertyValue('--red').trim(),
    magenta: getComputedStyle(document.documentElement).getPropertyValue('--magenta').trim(),
    blue: getComputedStyle(document.documentElement).getPropertyValue('--blue').trim(),
    green: getComputedStyle(document.documentElement).getPropertyValue('--green').trim(),
    amber: getComputedStyle(document.documentElement).getPropertyValue('--amber').trim(),
  };
  let currentAccentHex = colors.neutral; // se actualiza en cada goTo()

  const navItems    = document.querySelectorAll('.nav-item');
  const scenes       = document.querySelectorAll('.scene');
  const wipe          = document.getElementById('wipe');
  const breadcrumb    = document.getElementById('breadcrumbScene');
  const root           = document.documentElement;
  const reduceMotion  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Mouse real (computador). En celular/tablet es false: ahí se apagan la
  // estela de luz y el revelado del título, que dependen del cursor.
  const canHover      = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- CARGA DIFERIDA ----------
     hydrate(container): pone el src real (guardado en data-src por
     deferMedia) a las imágenes, portadas e iframes de ese contenedor.
     - Al entrar a una sección: solo el título (imagen del banner) y lo que
       esté fuera de las fichas.
     - Al abrir una ficha: sus imágenes, portadas y modelos de Sketchfab.
     - Los clips de galería se cargan al verse en pantalla (bloque 7) y los
       videos principales recién al darle play (bloque 8). */
  function hydrate(container, skipDetails){
    if(!container) return;
    const outside = el=> !skipDetails || !el.closest('.project-detail');
    container.querySelectorAll('img[data-src], iframe[data-src]').forEach(el=>{
      if(!outside(el)) return;
      el.src = el.dataset.src; el.removeAttribute('data-src');
    });
    container.querySelectorAll('video[data-poster]').forEach(v=>{
      if(!outside(v)) return;
      v.poster = v.dataset.poster; v.removeAttribute('data-poster');
    });
  }
  function hydrateScene(scene){
    if(!scene || scene.dataset.hydrated) return;
    scene.dataset.hydrated = '1';
    const banner = scene.querySelector('.section-banner[data-img]');
    if(banner && canHover) banner.style.setProperty('--banner-img', 'url("' + banner.dataset.img + '")');
    hydrate(scene, true);
  }

  // Pinta el puntito de color de cada botón del nav según su data-color
  navItems.forEach(item=>{
    item.style.setProperty('--item-color', colors[item.dataset.color] || colors.neutral);
  });

  /* ---------- 2. NAVEGACIÓN ENTRE ESCENAS ----------
     goTo(id): oculta la escena activa, muestra la escena "id", cambia
     el color de acento global, dispara el barrido de transición y
     actualiza el breadcrumb del HUD. */
  // Pausa los videos principales al salir de una ficha (si no, el audio
  // seguiría sonando con la ficha oculta). Los clips de galería se pausan
  // solos (bloque 7).
  function pauseMainVideos(container){
    container.querySelectorAll('.main-video video').forEach(v=> v.pause());
  }

  function resetAllProjectViews(){
    pauseMainVideos(document);
    document.querySelectorAll('.project-index').forEach(i=> i.hidden = false);
    document.querySelectorAll('.project-detail').forEach(d=> d.hidden = true);
  }

  function goTo(target){
    const current = document.querySelector('.scene.active');
    if(current && current.id === target) return;

    const targetItem = document.querySelector('.nav-item[data-target="'+target+'"]');
    const colorKey = targetItem ? targetItem.dataset.color : 'neutral';
    currentAccentHex = colors[colorKey] || colors.neutral;
    root.style.setProperty('--accent', currentAccentHex);

    if(!reduceMotion){
      wipe.classList.remove('play'); void wipe.offsetWidth; wipe.classList.add('play');
    }

    resetAllProjectViews();
    scenes.forEach(s=> s.classList.toggle('active', s.id === target));
    navItems.forEach(n=> n.classList.toggle('active', n.dataset.target === target));

    const activeScene = document.getElementById(target);
    hydrateScene(activeScene);
    if(activeScene){ breadcrumb.textContent = activeScene.dataset.name; activeScene.scrollTop = 0; }

    if(history.replaceState) history.replaceState(null, '', '#'+target);
  }

  /* ---------- 3. LISTA → DETALLE ----------
     openProject: oculta la lista de la escena y muestra el panel de
     detalle correspondiente. closeProject: hace lo inverso ("Volver"). */
  function openProject(sceneId, projectId){
    const scene = document.getElementById(sceneId);
    if(!scene) return;
    scene.querySelector('.project-index').hidden = true;
    scene.querySelectorAll('.project-detail').forEach(d=> d.hidden = (d.id !== projectId));
    scene.scrollTop = 0;
    const detail = document.getElementById(projectId);
    hydrate(detail);
    const titleEl = detail ? detail.querySelector('h3') : null;
    if(titleEl) breadcrumb.textContent = scene.dataset.name + ' / ' + titleEl.textContent.toUpperCase();
  }

  function closeProject(sceneId){
    const scene = document.getElementById(sceneId);
    if(!scene) return;
    pauseMainVideos(scene);
    scene.querySelector('.project-index').hidden = false;
    scene.querySelectorAll('.project-detail').forEach(d=> d.hidden = true);
    scene.scrollTop = 0;
    breadcrumb.textContent = scene.dataset.name;
  }

  navItems.forEach(item=> item.addEventListener('click', ()=> goTo(item.dataset.target)));
  document.querySelectorAll('[data-goto]').forEach(btn=> btn.addEventListener('click', ()=> goTo(btn.dataset.goto)));
  document.querySelectorAll('.work-item').forEach(item=> item.addEventListener('click', ()=> openProject(item.dataset.scene, item.dataset.target)));
  // Copia del botón "← Volver" al final de cada ficha, para no tener que
  // subir de nuevo hasta arriba al terminar de leer.
  document.querySelectorAll('.project-detail').forEach(detail=>{
    const top = detail.querySelector('.detail-back');
    if(!top) return;
    const bottom = top.cloneNode(true);
    bottom.classList.add('is-bottom');
    detail.appendChild(bottom);
  });
  document.querySelectorAll('.detail-back').forEach(btn=> btn.addEventListener('click', ()=> closeProject(btn.dataset.scene)));

  // Si la URL trae un #hash al cargar, abre esa escena directamente
  const hash = location.hash.replace('#','');
  if(hash && document.getElementById(hash)) goTo(hash);
  hydrateScene(document.querySelector('.scene.active'));

  /* ---------- 4. TEXTO QUE ROTA EN 3D (letra por letra) ----------
     splitLetters(el): reemplaza el texto de un elemento por un
     <span class="letter"> por carácter, con --i (su posición) para
     escalonar el delay de la animación "letter-in" (ver style.css).
     El texto original queda accesible vía aria-label. */
  function splitLetters(el){
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = '';
    let i = 0;
    [...text].forEach(ch=>{
      const span = document.createElement('span');
      if(ch === ' '){
        span.innerHTML = '&nbsp;';
      } else {
        span.textContent = ch;
        span.className = 'letter';
        span.style.setProperty('--i', i);
        i++;
      }
      span.setAttribute('aria-hidden', 'true');
      el.appendChild(span);
    });
  }
  if(!reduceMotion){
    document.querySelectorAll('[data-split]').forEach(splitLetters);
  }

  /* ---------- 5. ESTELA DE LUZ QUE SIGUE AL MOUSE ----------
     Dibuja círculos con degradado radial en las posiciones recientes
     del mouse; cada uno se desvanece según su edad. Está suavizada a
     propósito (alpha bajo + blur por CSS en #trailCanvas) para que
     nunca tape el contenido. Se desactiva si el usuario prefiere menos
     movimiento. */
  // Solo con mouse real: en celular no hay cursor y el dibujo continuo
  // gastaría batería. Además el bucle se detiene cuando no hay estela.
  if(!reduceMotion && canHover){
    const canvas = document.getElementById('trailCanvas');
    const ctx = canvas.getContext('2d');
    let points = [];
    const TRAIL_MS = 500;      // cuánto dura cada punto antes de desaparecer
    const PEAK_ALPHA = 0.16;   // opacidad máxima de cada punto
    const MAX_RADIUS = 34;     // radio máximo que alcanza un punto antes de morir

    function resizeCanvas(){
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function hexToRgb(hex){
      const n = parseInt(hex.replace('#',''), 16);
      return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
    }

    let running = false;
    window.addEventListener('pointermove', (e)=>{
      points.push({ x:e.clientX, y:e.clientY, born:performance.now() });
      if(points.length > 60) points.shift();
      if(!running){ running = true; requestAnimationFrame(drawTrail); }
    });

    function drawTrail(now){
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      points = points.filter(p=> now - p.born < TRAIL_MS);

      const { r, g, b } = hexToRgb(currentAccentHex);
      ctx.globalCompositeOperation = 'lighter';

      points.forEach(p=>{
        const age = (now - p.born) / TRAIL_MS;
        const alpha = (1 - age) * PEAK_ALPHA;
        const radius = 6 + age * MAX_RADIUS;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      if(points.length) requestAnimationFrame(drawTrail);
      else running = false; // quieto: no se redibuja hasta que el mouse se mueva
    }
  }

  /* ---------- 6. BANNER INTERACTIVO DE TÍTULO ----------
     Cada .section-banner tiene tres capas de texto superpuestas (ver
     style.css sección 5): el contorno (siempre visible), el relleno de
     color y una IMAGEN — estas dos últimas ocultas salvo al pasar el
     mouse, y solo dentro de un círculo que sigue al cursor.

     Acá hacemos dos cosas:
     a) Si el banner tiene data-img="ruta/a/imagen.jpg", lo pasamos a la
        variable CSS --banner-img para que .banner-image la use.
     b) Seguimos el mouse sobre el banner y actualizamos --mx / --my (en
        px, relativos al propio banner) para mover ese círculo — así la
        imagen/color "aparece" donde está el cursor, como una linterna. */
  // (La imagen --banner-img la pone hydrateScene al entrar a la sección,
  //  y solo en computador: en celular el revelado está apagado por CSS.)
  document.querySelectorAll('.section-banner').forEach(banner=>{
    if(reduceMotion || !canHover) return; // sin efecto linterna: la imagen queda fija (ver CSS)

    banner.addEventListener('pointermove', (e)=>{
      const rect = banner.getBoundingClientRect();
      banner.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      banner.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    });
    banner.addEventListener('pointerleave', ()=>{
      banner.style.setProperty('--mx', '50%');
      banner.style.setProperty('--my', '50%');
    });
  });

  /* ---------- 7. GALERÍA DE CLIPS + VISOR AMPLIADO ----------
     Para cada .clip-slot (plantilla en sections/experiencias-interactivas.html):
     a) Si el video carga, el slot pasa a borde sólido (.is-ready). Si no
        carga, se quita el <video> y queda el slot punteado con el texto
        de .clip-ph (.is-missing), en vez de un cuadro roto.
     b) Reproducción tipo GIF: un IntersectionObserver le da play solo
        mientras el clip está en pantalla y lo pausa cuando sale. No se usa
        el atributo autoplay porque haría que los 4 arranquen y se
        descarguen aunque la ficha esté cerrada. Con "reducir movimiento"
        activado no arrancan solos (se pueden ver en el visor).
     c) Clic -> el mismo <video> se mueve a un visor a pantalla completa
        (con controles). Se cierra con el botón, con Esc o con clic fuera
        del video, y el video vuelve a su cuadro. */
  const clipSlots = document.querySelectorAll('.clip-slot');
  if(clipSlots.length){
    const visibleClips = new WeakSet();
    const io = ('IntersectionObserver' in window) ? new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        const v = entry.target;
        if(v.closest('.lightbox')) return; // en el visor lo controla el usuario
        if(entry.isIntersecting){
          visibleClips.add(v);
          loadClip(v);
          if(!reduceMotion) v.play().catch(()=>{});
        } else {
          visibleClips.delete(v);
          v.pause();
        }
      });
    }, { threshold: 0.25 }) : null;

    // El clip se descarga recién la primera vez que aparece en pantalla
    function loadClip(v){
      if(!v.dataset.src) return;
      v.src = v.dataset.src; v.removeAttribute('data-src');
      v.preload = 'auto';
    }

    function markMissing(slot, media){
      slot.classList.remove('is-ready');
      slot.classList.add('is-missing');
      slot.disabled = true;
      if(io && media.tagName === 'VIDEO') io.unobserve(media);
      media.remove();
    }

    clipSlots.forEach(slot=>{
      // Foto en vez de clip: solo estado listo / faltante (sin play)
      // Como los archivos se cargan tarde, el cuadro se muestra "listo"
      // desde el principio y solo vuelve al punteado si el archivo falla.
      const img = slot.querySelector('img');
      if(img){
        slot.classList.add('is-ready');
        img.addEventListener('error', ()=> markMissing(slot, img));
        return;
      }
      const video = slot.querySelector('video');
      if(!video) return;
      video.muted = true; // los navegadores solo permiten play automático en silencio
      slot.classList.add('is-ready');
      video.addEventListener('error', ()=> markMissing(slot, video));
      if(io) io.observe(video); else loadClip(video);
    });

    // Visor: se crea una sola vez y se reutiliza para todos los clips
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Video ampliado');
    box.innerHTML = '<button class="btn lightbox-close" type="button">Cerrar ✕</button>' +
                    '<div class="lightbox-stage"></div><p class="lightbox-caption"></p>';
    document.body.appendChild(box);
    const stage = box.querySelector('.lightbox-stage');
    const caption = box.querySelector('.lightbox-caption');
    const closeBtn = box.querySelector('.lightbox-close');
    let openSlot = null;

    function openClip(slot){
      const media = slot.querySelector('video, img');
      if(!media || !slot.classList.contains('is-ready')) return;
      openSlot = slot;
      stage.appendChild(media);
      box.setAttribute('aria-label', media.tagName === 'IMG' ? 'Imagen ampliada' : 'Video ampliado');
      if(media.tagName === 'IMG'){
        caption.textContent = '';
        caption.hidden = true;
        box.hidden = false;
        closeBtn.focus();
        return;
      }
      const video = media;
      loadClip(video);
      video.controls = true;
      const cap = slot.closest('.clip') ? slot.closest('.clip').querySelector('.clip-caption') : null;
      caption.textContent = cap ? cap.textContent : '';
      caption.hidden = !caption.textContent;
      box.hidden = false;
      video.play().catch(()=>{});
      closeBtn.focus();
    }

    function closeClip(){
      if(!openSlot) return;
      const img = stage.querySelector('img');
      if(img) openSlot.appendChild(img);
      const video = stage.querySelector('video');
      if(video){
        video.controls = false;
        openSlot.appendChild(video); // vuelve a su cuadro
        if(visibleClips.has(video) && !reduceMotion) video.play().catch(()=>{});
        else video.pause();
      }
      box.hidden = true;
      openSlot.focus();
      openSlot = null;
    }

    clipSlots.forEach(slot=> slot.addEventListener('click', ()=> openClip(slot)));
    closeBtn.addEventListener('click', closeClip);
    // Clic fuera del video (fondo, zona del escenario o pie) cierra
    box.addEventListener('click', e=>{ if(e.target !== closeBtn && !(e.target instanceof HTMLVideoElement) && !(e.target instanceof HTMLImageElement)) closeClip(); });
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && openSlot) closeClip(); });
  }

  /* ---------- 8. VIDEO PRINCIPAL DE FICHA ----------
     Para cada .main-video (plantilla en sections/experiencias-interactivas.html):
     a) Escribe la duración (data-duration del <video>) en la etiqueta del
        botón ("▶ REPRODUCIR · 0:57"), sin descargar nada del video.
     b) Al cargar, ajusta la proporción del marco a la del video
        (--mv-ratio/--mv-ar, ver style.css bloque 13).
     c) Al hacer clic en la capa: recién ahí pone el src y descarga el
        video, quita la capa, activa los controles y reproduce. Si se
        pausa, la capa no vuelve. Mientras tanto se ve la portada (poster). */
  document.querySelectorAll('.main-video').forEach(box=>{
    const video = box.querySelector('video');
    const overlay = box.querySelector('.mv-overlay');
    const timeEl = box.querySelector('.mv-time');
    if(!video || !overlay) return;
    let started = false;

    // Duración: viene escrita en data-duration (así no hay que descargar
    // nada del video para mostrarla). La proporción se ajusta al cargar.
    if(timeEl && video.dataset.duration) timeEl.textContent = video.dataset.duration;
    video.addEventListener('loadedmetadata', ()=>{
      if(video.videoWidth && video.videoHeight){
        box.style.setProperty('--mv-ratio', video.videoWidth + ' / ' + video.videoHeight);
        box.style.setProperty('--mv-ar', video.videoWidth / video.videoHeight);
      }
    });

    function start(){
      if(started) return;
      started = true;
      box.classList.add('is-playing');
      video.controls = true;
      // Recién acá se descarga el video
      if(video.dataset.src){ video.src = video.dataset.src; video.removeAttribute('data-src'); }
      video.preload = 'auto';
      video.play().catch(()=>{});
      video.focus();
    }
    overlay.addEventListener('click', start);
    // Por si se inicia de otra forma (teclado, pantalla completa, etc.)
    video.addEventListener('play', ()=>{ if(!started){ started = true; box.classList.add('is-playing'); video.controls = true; } });
  });
}
