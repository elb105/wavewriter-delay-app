# Casos límite de programación del WaveWriter Alpha

Lista de configuraciones que conviene probar en el estimulador para saber si se
pueden programar y si el retardo medido coincide con el que calcula la app.
Todos los valores previstos están calculados con el mismo modelo que usa la app
(3010 µs por salto, áreas siempre en orden A → B → C → D).

**Qué cubren ya las medidas hechas.** Los tests de Spike2 (oct. 2026) se
hicieron casi todos con **A = 250 µs** y **a 20 Hz**, con las cuatro áreas
encendidas o con las del final apagadas. Por eso las prioridades de esta lista
son: anchos de A distintos de 250 µs, áreas intermedias apagadas, frecuencias
distintas de 20 Hz y los extremos de cada rango.

## Cómo usar esta lista

1. Programe la configuración en el WaveWriter Alpha (si el programador no la
   acepta, anótelo: ese es el resultado).
2. Mida con el Power 1401 / Spike2 el retardo entre el inicio del pulso de A y
   el del área final. **Con pulsos de 20 µs muestree a 100 kHz o más** (a 25 kHz
   y 50 kHz se pierden pulsos, como pasó en el Test 4) o use el osciloscopio.
3. Compare con la columna «Previsto» y anote el resultado en la última columna.

Prioridad: **●●●** imprescindible · **●●** recomendable · **●** complementaria.
Salvo que se indique otra cosa: frecuencia 20 Hz, A y área final a 4 mA,
intermedias a 0,1 mA, área final de 250 µs.

## 1. Extremos de los rangos configurables

Comprueban que la regla se cumple con anchos de A distintos de 250 µs y en los
límites de 20 y 1000 µs.

| ID | Prior. | A | B | C | D | Previsto | Qué comprobar | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | ●●● | 20 µs | 250 µs (final) | OFF | OFF | **3030 µs** A→B (mínimo absoluto) | Retardo = 20 + 3010 | |
| L2 | ●●● | 1000 µs | 250 µs (final) | OFF | OFF | **4010 µs** A→B (máximo A→B) | Retardo = 1000 + 3010 | |
| L3 | ●● | 20 µs | 20 µs | 250 µs (final) | OFF | **6060 µs** A→C (mínimo A→C) | | |
| L4 | ●● | 1000 µs | 1000 µs | 250 µs (final) | OFF | **8020 µs** A→C (máximo A→C) | | |
| L5 | ●●● | 20 µs | 20 µs | 20 µs | 20 µs (final) | **9090 µs** A→D (mínimo A→D) | Con pulsos de 20 µs, muestrear ≥ 100 kHz | |
| L6 | ●●● | 1000 µs | 1000 µs | 1000 µs | 1000 µs (final) | **12 030 µs** A→D (máximo absoluto) | | |

## 2. Valores que la app marca como no configurables

No hay ninguna programación que los dé. Lo que se puede comprobar en el equipo
es que de verdad no hay forma de alcanzarlos: que el programador no acepta
anchos fuera de 20–1000 µs ni pasos distintos de 10 µs.

| ID | Prior. | Retardo pedido | Por qué no se puede | Más cercanos posibles | Qué comprobar | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | ●● | 3020 µs | Por debajo del mínimo (A = 20 µs → 3030) | 3030 µs | El programador no acepta A = 10 µs | |
| N2 | ●● | 4020 – 6050 µs | Hueco entre A→B y A→C, con cualquier ancho de A | 4010 / 6060 µs | El programador no acepta A ni B > 1000 µs | |
| N3 | ●● | 8030 – 9080 µs | Hueco entre A→C y A→D, con cualquier ancho de A | 8020 / 9090 µs | Ídem | |
| N4 | ● | 12 040 µs o más | Por encima del máximo | 12 030 µs | Ídem | |
| N5 | ● | 9325 µs | No es múltiplo de 10 µs | 9320 / 9330 µs | El programador solo admite anchos en pasos de 10 µs | |

## 3. Áreas intermedias

| ID | Prior. | Configuración | Previsto | Qué comprobar | Resultado |
| --- | --- | --- | --- | --- | --- |
| I1 | ●●● | A 250 · **B OFF** · C 250 (final) · D OFF | La app supone que un área apagada no cuenta: C se comportaría como si fuera B → **3260 µs**. Si contara: 250 + PW_B + 6020 | **Supuesto sin medir.** Decide si se puede «saltar» un área apagada | |
| I2 | ●●● | A 250 · B 250 · **C OFF** · D 250 (final) | Si el área apagada no cuenta: **6520 µs** (250 + 250 + 2 × 3010) | Igual que I1, con el hueco en C | |
| I3 | ●● | A 250 · **B a 0 mA** (encendida en el programador) · C 250 (final) | ¿0 mA equivale a OFF? | Si el programador permite 0 mA con el área activa y cómo afecta al retardo | |
| I4 | ●● | A 250 · B 20 · C 1000 · D 250 (final) | **10 300 µs** | Mismo retardo que I5: el orden del reparto no importa | |
| I5 | ●● | A 250 · B 1000 · C 20 · D 250 (final) | **10 300 µs** | Ídem | |
| I6 | ● | A 250 · B 20 · C 20 · D 250, con **B y C a 4 mA** en vez de 0,1 mA | **9320 µs** (como el Test 4) | La amplitud de las intermedias no cambia el tiempo | |
| I7 | ● | A 250 · B 20 · C 20 · **D 20 µs** y luego **D 1000 µs** (final) | **9320 µs** en los dos casos | El ancho del área final no influye en el retardo | |

## 4. Frecuencia y duración del ciclo

La regla solo vale si el ciclo completo (suma de anchos + 3010 µs por cada área
encendida) cabe en el periodo. La app avisa cuando no cabe. Estos casos
comprueban el límite justo por debajo y por encima.

| ID | Prior. | Configuración | Ciclo | Frecuencia máx. que cabe | Probar a | Previsto | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | ●●● | L6 (todas a 1000 µs, A→D) | 16 040 µs | 62 Hz | **60 Hz** y **70 Hz** | 60 Hz: 12 030 µs · 70 Hz: no cabe, retardo distinto | |
| F2 | ●●● | L5 (todas a 20 µs, A→D) | 12 120 µs | 82 Hz | **80 Hz** y **90 Hz** | 80 Hz: 9090 µs · 90 Hz: no cabe | |
| F3 | ●● | A 250 · B 250 (A→B) | 6520 µs | 153 Hz | **150 Hz** y **200 Hz** | 150 Hz: 3260 µs · 200 Hz: no cabe | |
| F4 | ●● | A 250 · B 20 · C 20 · D 250 (9320 µs) | 12 580 µs | 79 Hz | **2, 10, 40, 50 Hz** | 9320 µs en todas (regla solo medida con Spike2 a 20 Hz) | |
| F5 | ● | 4 áreas encendidas | — | — | **130 Hz** | En la caracterización el programador no dejó configurarlo | |
| F6 | ● | 3 y 4 áreas encendidas | — | — | **700 y 800 Hz** | A 700 Hz no se pudieron encender 4 áreas; a 800 Hz, más de 2 | |
| F7 | ● | Áreas con **frecuencias distintas** entre sí | — | — | p. ej. A a 20 Hz, D a 40 Hz | El modelo supone la misma frecuencia en todas: comprobar qué pasa | |

## 5. Amplitudes extremas

| ID | Prior. | Configuración | Previsto | Qué comprobar | Resultado |
| --- | --- | --- | --- | --- | --- |
| A1 | ●● | L6 con A y D a **25,5 mA** (máximo) | 12 030 µs | Si el equipo permite máxima amplitud con 1000 µs en 4 áreas a 20 Hz (límite de energía) y si cambia el tiempo | |
| A2 | ● | A y D a **0,1 mA** (mínimo) | Igual que con 4 mA | La amplitud no cambia el tiempo | |

## 6. Retardo 0 (Hebb−)

| ID | Prior. | Configuración | Previsto | Qué comprobar | Resultado |
| --- | --- | --- | --- | --- | --- |
| H1 | ●● | Una sola área (A) con **dos contactos** y la corriente repartida (p. ej. 50 % / 50 %) | 0 µs | Que los dos contactos estimulan a la vez y cómo se reparte la amplitud | |

## 7. Contactos y montaje

| ID | Prior. | Configuración | Previsto | Qué comprobar | Resultado |
| --- | --- | --- | --- | --- | --- |
| C1 | ●● | Misma programación con las áreas en **contactos de puertos distintos** (p. ej. A en el 3, D en el 27) | Mismo retardo | El contacto o el puerto no cambian el tiempo | |
| C2 | ● | Dos áreas en el **mismo cable** (como la configuración 1.3) frente a cables distintos | Mismo retardo | El montaje no cambia el tiempo | |
| C3 | ● | Dos áreas en el **mismo contacto** | — | Si el programador lo permite y qué se mide | |

## 8. Repetibilidad

| ID | Prior. | Prueba | Previsto | Qué comprobar | Resultado |
| --- | --- | --- | --- | --- | --- |
| R1 | ●● | Repetir L1 y L6 tras **apagar y encender** la estimulación | Mismo retardo | Que el retardo no depende de la sesión | |
| R2 | ● | Repetir con la **batería baja** y **tras cargar** el IPG | Mismo retardo | Que la carga no afecta al tiempo | |
| R3 | ● | **Cambiar de programa** en el mando y volver | Mismo retardo | Que el programa guardado se reproduce igual | |

## Qué hacer con los resultados

* Si **I1 / I2** muestran que un área apagada sí añade un salto, hay que cambiar
  el modelo de la app (ahora supone que no cuenta).
* Si **L1–L6** o **F4** se apartan más de una muestra del valor previsto, la
  constante de 3010 µs puede depender del ancho de A o de la frecuencia; se
  puede ajustar en «Ajustes avanzados» mientras se corrige el modelo.
* Si **F1–F3** muestran el cambio justo donde predice el ciclo, se confirma el
  aviso de «el ciclo no cabe en el periodo».
