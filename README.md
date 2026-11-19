# Retardos WaveWriter Alpha

## 👉 [Abrir la aplicación: https://elb105.github.io/wavewriter-delay-app/](https://elb105.github.io/wavewriter-delay-app/)

Aplicación web instalable (PWA) que indica cómo programar las áreas A–D del
WaveWriter Alpha para conseguir un retardo entre el primer y el último estímulo.
Funciona en Windows, macOS, iOS y Android, y sin conexión una vez instalada.

## Qué hace

Datos que introduce el usuario:

* ancho de pulso y amplitud del área inicial (A) y del área final;
* retardo deseado entre el inicio del pulso de A y el del área final (µs);
* frecuencia (de la lista de valores del equipo);
* contacto (1–32) conectado a cada área.

La app calcula qué áreas se encienden, cuál es la final (B, C o D) y el ancho de
pulso de las áreas intermedias, que se ponen a 0,1 mA (el mínimo del equipo)
solo para añadir retardo. La frecuencia y los contactos no cambian el cálculo:
se guardan en el registro y la frecuencia genera avisos si el ciclo no cabe en
el periodo o si en la caracterización se observaron limitaciones a esa
frecuencia.

## Modelo

Medido con el Power 1401 / Spike2 a 20 Hz (informe REWIRE del 16-11-2026):

    inicio del área siguiente = inicio de la anterior + ancho de la anterior + 3010 µs

El fabricante indica 3000 µs; el valor se puede cambiar en «Ajustes avanzados».
Con A = 250 µs, los retardos posibles son 3260 µs (A→B), 6290–7270 µs (A→C) y
9320–11 280 µs (A→D), en pasos de 10 µs. Si el retardo pedido cae fuera, la app
muestra la configuración más cercana y qué ancho de A lo haría alcanzable.

La regla se cumple en todos los tests a 20 Hz con error < 1 µs. A 150 Hz no se
cumplió (Test 5), porque el ciclo calculado no cabía en el periodo: la app lo
avisa. Límites del equipo: ancho 20–1000 µs (paso 10), amplitud 0,1–25,5 mA
(paso 0,1), frecuencia 2–1200 Hz.

## Registro de pruebas

«Guardar prueba» guarda la configuración, los contactos, la frecuencia, un
identificador y notas en el propio dispositivo. Se puede exportar a CSV (para
Excel, separador `;`) y hacer una copia de seguridad en JSON para pasar el
registro a otro dispositivo («Restaurar copia» la fusiona sin duplicar).

## Instalación

**Dirección de la app: https://elb105.github.io/wavewriter-delay-app/**

No hace falta instalar nada más (ni Python ni librerías): basta un navegador.
Desde esa dirección:

| Sistema | Navegador | Cómo instalar |
| --- | --- | --- |
| Windows | Edge o Chrome | Botón «Instalar» de la app, o icono de instalar en la barra de direcciones |
| macOS | Chrome o Edge | Igual que en Windows |
| macOS | Safari 17+ | Archivo → Añadir al Dock |
| iOS / iPadOS | Safari | Compartir → Añadir a pantalla de inicio |
| Android | Chrome | Botón «Instalar» o menú ⋮ → Instalar aplicación |

Sin publicar, se puede usar en el ordenador abriendo `index.html` con doble
clic (funciona todo salvo la instalación y el modo sin conexión), o con un
servidor local:

    py -3.11 -m http.server 8765

y abriendo http://localhost:8765.

## Proyecto relacionado

El modelo de retardo sale del análisis de las grabaciones con el Power 1401,
en el repositorio [elb105/wavewriter-delay-analysis](https://github.com/elb105/wavewriter-delay-analysis)
(privado). Ambos forman parte del proyecto REWIRE / CONECTOMA.

## Ficheros

* `calc.js`: modelo de cálculo (sin dependencias).
* `app.js`, `index.html`, `styles.css`: interfaz.
* `manifest.webmanifest`, `sw.js`, `icons/`: instalación y uso sin conexión.
  Al publicar una versión nueva, cambie `CACHE` en `sw.js` (p. ej. `ww-delay-v2`).
