-- Siembra del Módulo 2 (Motor de Reportes Unificado): 1800 reportes para
-- poder probar paginación, filtros por tipo/estado y el mapa de calor antes
-- de ejercitar el alta manual (REP-01/REP-02/REP-03, CrearReporte).
-- Los reportes 'problematica' ya distribuían sus 3 subtipos al azar
-- (animal_suelto/foco_sanitario/accidente_vial) desde el bloque original —
-- verificado como parte de esta actividad, sin cambios necesarios acá.
-- Adaptado del bloque "reportes" de docs/SEED.md (mismo volumen, misma
-- distribución de tipo/estado y el mismo jitter geográfico alrededor de
-- Coronel Pringles) — a diferencia del script maestro, este no depende de
-- las tablas temporales tmp_dueños/tmp_mascotas: selecciona un dueño y,
-- cuando corresponde, una mascota al azar directo de las tablas reales, así
-- se puede correr de forma independiente (siempre que ya existan dueños y
-- mascotas — ver seed-duenos.sql y seed-mascotas.sql).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-duenos.sql    -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-mascotas.sql  -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-reportes.sql

BEGIN;

-- 1798 reportes aleatorios + 2 garantizados (bloque siguiente) = 1800 en total.
INSERT INTO reportes (tipo, subtipo, reportado_por, mascota_id, descripcion, foto_url,
                       latitud, longitud, especie, estado, created_at)
SELECT
  t.tipo,
  CASE WHEN t.tipo = 'problematica'
       THEN (ARRAY['animal_suelto','foco_sanitario','accidente_vial'])[1 + floor(random() * 3)::int]
       ELSE NULL END,
  (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
  CASE WHEN t.tipo IN ('perdido', 'encontrado') AND random() < 0.6
       THEN (SELECT id FROM mascotas WHERE deleted_at IS NULL ORDER BY random() LIMIT 1)
       ELSE NULL END,
  (CASE gs
  WHEN 1 THEN 'Reporte registrado en General Paz 275, Coronel Pringles.'
  WHEN 2 THEN 'Reporte registrado en Colón 660, Coronel Pringles.'
  WHEN 3 THEN 'Reporte registrado en Brown 1318, Coronel Pringles.'
  WHEN 4 THEN 'Reporte registrado en Rivadavia 610, Coronel Pringles.'
  WHEN 5 THEN 'Reporte registrado en 9 de Julio 488, Coronel Pringles.'
  WHEN 6 THEN 'Reporte registrado en Colón 1037, Coronel Pringles.'
  WHEN 7 THEN 'Reporte registrado en General Paz 1632, Coronel Pringles.'
  WHEN 8 THEN 'Reporte registrado en Bahía Blanca 138, Coronel Pringles.'
  WHEN 9 THEN 'Reporte registrado en Chacabuco 561, Coronel Pringles.'
  WHEN 10 THEN 'Reporte registrado en Tucumán 899, Coronel Pringles.'
  WHEN 11 THEN 'Reporte registrado en Garay 1275, Coronel Pringles.'
  WHEN 12 THEN 'Reporte registrado en Urquiza 622, Coronel Pringles.'
  WHEN 13 THEN 'Reporte registrado en Sarmiento 720, Coronel Pringles.'
  WHEN 14 THEN 'Reporte registrado en Belgrano 444, Coronel Pringles.'
  WHEN 15 THEN 'Reporte registrado en Alsina 92, Coronel Pringles.'
  WHEN 16 THEN 'Reporte registrado en Belgrano 1422, Coronel Pringles.'
  WHEN 17 THEN 'Reporte registrado en Dorrego 293, Coronel Pringles.'
  WHEN 18 THEN 'Reporte registrado en Necochea 455, Coronel Pringles.'
  WHEN 19 THEN 'Reporte registrado en Tucumán 1114, Coronel Pringles.'
  WHEN 20 THEN 'Reporte registrado en Chacabuco 164, Coronel Pringles.'
  WHEN 21 THEN 'Reporte registrado en Moreno 1162, Coronel Pringles.'
  WHEN 22 THEN 'Reporte registrado en Tucumán 186, Coronel Pringles.'
  WHEN 23 THEN 'Reporte registrado en San Martín 99, Coronel Pringles.'
  WHEN 24 THEN 'Reporte registrado en Rodríguez Peña 81, Coronel Pringles.'
  WHEN 25 THEN 'Reporte registrado en Rodríguez Peña 181, Coronel Pringles.'
  WHEN 26 THEN 'Reporte registrado en Dorrego 209, Coronel Pringles.'
  WHEN 27 THEN 'Reporte registrado en Francia 350, Coronel Pringles.'
  WHEN 28 THEN 'Reporte registrado en Colón 1638, Coronel Pringles.'
  WHEN 29 THEN 'Reporte registrado en Belgrano 844, Coronel Pringles.'
  WHEN 30 THEN 'Reporte registrado en Urquiza 1030, Coronel Pringles.'
  WHEN 31 THEN 'Reporte registrado en Islas Malvinas 394, Coronel Pringles.'
  WHEN 32 THEN 'Reporte registrado en Chiclana 986, Coronel Pringles.'
  WHEN 33 THEN 'Reporte registrado en Sarmiento 1359, Coronel Pringles.'
  WHEN 34 THEN 'Reporte registrado en Lavalle 1224, Coronel Pringles.'
  WHEN 35 THEN 'Reporte registrado en José Hernández 907, Coronel Pringles.'
  WHEN 36 THEN 'Reporte registrado en Uruguay 1015, Coronel Pringles.'
  WHEN 37 THEN 'Reporte registrado en Alsina 929, Coronel Pringles.'
  WHEN 38 THEN 'Reporte registrado en Chacabuco 655, Coronel Pringles.'
  WHEN 39 THEN 'Reporte registrado en Tucumán 3, Coronel Pringles.'
  WHEN 40 THEN 'Reporte registrado en Rivadavia 789, Coronel Pringles.'
  WHEN 41 THEN 'Reporte registrado en Hipólito Yrigoyen 292, Coronel Pringles.'
  WHEN 42 THEN 'Reporte registrado en Colón 171, Coronel Pringles.'
  WHEN 43 THEN 'Reporte registrado en Brown 592, Coronel Pringles.'
  WHEN 44 THEN 'Reporte registrado en Urquiza 450, Coronel Pringles.'
  WHEN 45 THEN 'Reporte registrado en Italia 155, Coronel Pringles.'
  WHEN 46 THEN 'Reporte registrado en Roca 1192, Coronel Pringles.'
  WHEN 47 THEN 'Reporte registrado en 15 de Julio 874, Coronel Pringles.'
  WHEN 48 THEN 'Reporte registrado en España 557, Coronel Pringles.'
  WHEN 49 THEN 'Reporte registrado en 9 de Julio 18, Coronel Pringles.'
  WHEN 50 THEN 'Reporte registrado en Urquiza 887, Coronel Pringles.'
  WHEN 51 THEN 'Reporte registrado en Rodríguez Peña 14, Coronel Pringles.'
  WHEN 52 THEN 'Reporte registrado en Hipólito Yrigoyen 342, Coronel Pringles.'
  WHEN 53 THEN 'Reporte registrado en San Martín 227, Coronel Pringles.'
  WHEN 54 THEN 'Reporte registrado en Lavalle 679, Coronel Pringles.'
  WHEN 55 THEN 'Reporte registrado en España 555, Coronel Pringles.'
  WHEN 56 THEN 'Reporte registrado en General Paz 544, Coronel Pringles.'
  WHEN 57 THEN 'Reporte registrado en 25 de Mayo 121, Coronel Pringles.'
  WHEN 58 THEN 'Reporte registrado en Francia 378, Coronel Pringles.'
  WHEN 59 THEN 'Reporte registrado en Sarmiento 30, Coronel Pringles.'
  WHEN 60 THEN 'Reporte registrado en General Paz 267, Coronel Pringles.'
  WHEN 61 THEN 'Reporte registrado en Francia 212, Coronel Pringles.'
  WHEN 62 THEN 'Reporte registrado en 15 de Julio 1511, Coronel Pringles.'
  WHEN 63 THEN 'Reporte registrado en Lavalle 223, Coronel Pringles.'
  WHEN 64 THEN 'Reporte registrado en Pellegrini 536, Coronel Pringles.'
  WHEN 65 THEN 'Reporte registrado en Garay 182, Coronel Pringles.'
  WHEN 66 THEN 'Reporte registrado en Maipú 139, Coronel Pringles.'
  WHEN 67 THEN 'Reporte registrado en Roca 68, Coronel Pringles.'
  WHEN 68 THEN 'Reporte registrado en Hipólito Yrigoyen 1391, Coronel Pringles.'
  WHEN 69 THEN 'Reporte registrado en Sáenz Peña 1198, Coronel Pringles.'
  WHEN 70 THEN 'Reporte registrado en Lavalle 23, Coronel Pringles.'
  WHEN 71 THEN 'Reporte registrado en San Martín 272, Coronel Pringles.'
  WHEN 72 THEN 'Reporte registrado en Chiclana 735, Coronel Pringles.'
  WHEN 73 THEN 'Reporte registrado en Francia 212, Coronel Pringles.'
  WHEN 74 THEN 'Reporte registrado en Cabrera 363, Coronel Pringles.'
  WHEN 75 THEN 'Reporte registrado en Rodríguez Peña 165, Coronel Pringles.'
  WHEN 76 THEN 'Reporte registrado en Uruguay 266, Coronel Pringles.'
  WHEN 77 THEN 'Reporte registrado en Sarmiento 1788, Coronel Pringles.'
  WHEN 78 THEN 'Reporte registrado en Lavalle 30, Coronel Pringles.'
  WHEN 79 THEN 'Reporte registrado en Italia 1792, Coronel Pringles.'
  WHEN 80 THEN 'Reporte registrado en Suárez 308, Coronel Pringles.'
  WHEN 81 THEN 'Reporte registrado en Chiclana 1364, Coronel Pringles.'
  WHEN 82 THEN 'Reporte registrado en Lavalle 406, Coronel Pringles.'
  WHEN 83 THEN 'Reporte registrado en Moreno 669, Coronel Pringles.'
  WHEN 84 THEN 'Reporte registrado en Artigas 1155, Coronel Pringles.'
  WHEN 85 THEN 'Reporte registrado en Belgrano 767, Coronel Pringles.'
  WHEN 86 THEN 'Reporte registrado en 24 de Septiembre 902, Coronel Pringles.'
  WHEN 87 THEN 'Reporte registrado en 9 de Julio 1384, Coronel Pringles.'
  WHEN 88 THEN 'Reporte registrado en José Hernández 756, Coronel Pringles.'
  WHEN 89 THEN 'Reporte registrado en Artigas 328, Coronel Pringles.'
  WHEN 90 THEN 'Reporte registrado en Roca 65, Coronel Pringles.'
  WHEN 91 THEN 'Reporte registrado en Belgrano 69, Coronel Pringles.'
  WHEN 92 THEN 'Reporte registrado en Sarmiento 214, Coronel Pringles.'
  WHEN 93 THEN 'Reporte registrado en Islas Malvinas 888, Coronel Pringles.'
  WHEN 94 THEN 'Reporte registrado en Belgrano 104, Coronel Pringles.'
  WHEN 95 THEN 'Reporte registrado en Brown 35, Coronel Pringles.'
  WHEN 96 THEN 'Reporte registrado en 15 de Julio 736, Coronel Pringles.'
  WHEN 97 THEN 'Reporte registrado en 25 de Mayo 427, Coronel Pringles.'
  WHEN 98 THEN 'Reporte registrado en España 202, Coronel Pringles.'
  WHEN 99 THEN 'Reporte registrado en Lavalle 430, Coronel Pringles.'
  WHEN 100 THEN 'Reporte registrado en Brown 165, Coronel Pringles.'
  WHEN 101 THEN 'Reporte registrado en Artigas 20, Coronel Pringles.'
  WHEN 102 THEN 'Reporte registrado en Dorrego 281, Coronel Pringles.'
  WHEN 103 THEN 'Reporte registrado en Maipú 243, Coronel Pringles.'
  WHEN 104 THEN 'Reporte registrado en José Ingenieros 170, Coronel Pringles.'
  WHEN 105 THEN 'Reporte registrado en Avellaneda 1064, Coronel Pringles.'
  WHEN 106 THEN 'Reporte registrado en Suárez 140, Coronel Pringles.'
  WHEN 107 THEN 'Reporte registrado en 15 de Julio 618, Coronel Pringles.'
  WHEN 108 THEN 'Reporte registrado en Necochea 487, Coronel Pringles.'
  WHEN 109 THEN 'Reporte registrado en Moreno 711, Coronel Pringles.'
  WHEN 110 THEN 'Reporte registrado en Garay 409, Coronel Pringles.'
  WHEN 111 THEN 'Reporte registrado en Uruguay 55, Coronel Pringles.'
  WHEN 112 THEN 'Reporte registrado en General Paz 269, Coronel Pringles.'
  WHEN 113 THEN 'Reporte registrado en Alsina 952, Coronel Pringles.'
  WHEN 114 THEN 'Reporte registrado en Maipú 56, Coronel Pringles.'
  WHEN 115 THEN 'Reporte registrado en Alvear 1147, Coronel Pringles.'
  WHEN 116 THEN 'Reporte registrado en General Paz 523, Coronel Pringles.'
  WHEN 117 THEN 'Reporte registrado en Belgrano 562, Coronel Pringles.'
  WHEN 118 THEN 'Reporte registrado en Dorrego 671, Coronel Pringles.'
  WHEN 119 THEN 'Reporte registrado en España 465, Coronel Pringles.'
  WHEN 120 THEN 'Reporte registrado en 9 de Julio 1561, Coronel Pringles.'
  WHEN 121 THEN 'Reporte registrado en Belgrano 605, Coronel Pringles.'
  WHEN 122 THEN 'Reporte registrado en Lavalle 786, Coronel Pringles.'
  WHEN 123 THEN 'Reporte registrado en 15 de Julio 676, Coronel Pringles.'
  WHEN 124 THEN 'Reporte registrado en Suárez 909, Coronel Pringles.'
  WHEN 125 THEN 'Reporte registrado en Artigas 677, Coronel Pringles.'
  WHEN 126 THEN 'Reporte registrado en Sáenz Peña 843, Coronel Pringles.'
  WHEN 127 THEN 'Reporte registrado en José Ingenieros 165, Coronel Pringles.'
  WHEN 128 THEN 'Reporte registrado en Tucumán 451, Coronel Pringles.'
  WHEN 129 THEN 'Reporte registrado en Necochea 869, Coronel Pringles.'
  WHEN 130 THEN 'Reporte registrado en Belgrano 461, Coronel Pringles.'
  WHEN 131 THEN 'Reporte registrado en José Ingenieros 1113, Coronel Pringles.'
  WHEN 132 THEN 'Reporte registrado en Mitre 29, Coronel Pringles.'
  WHEN 133 THEN 'Reporte registrado en Cabrera 111, Coronel Pringles.'
  WHEN 134 THEN 'Reporte registrado en Colón 715, Coronel Pringles.'
  WHEN 135 THEN 'Reporte registrado en Alsina 501, Coronel Pringles.'
  WHEN 136 THEN 'Reporte registrado en Maipú 753, Coronel Pringles.'
  WHEN 137 THEN 'Reporte registrado en Hipólito Yrigoyen 1344, Coronel Pringles.'
  WHEN 138 THEN 'Reporte registrado en Maipú 640, Coronel Pringles.'
  WHEN 139 THEN 'Reporte registrado en Colón 946, Coronel Pringles.'
  WHEN 140 THEN 'Reporte registrado en Necochea 147, Coronel Pringles.'
  WHEN 141 THEN 'Reporte registrado en Colón 638, Coronel Pringles.'
  WHEN 142 THEN 'Reporte registrado en Bahía Blanca 584, Coronel Pringles.'
  WHEN 143 THEN 'Reporte registrado en Rivadavia 61, Coronel Pringles.'
  WHEN 144 THEN 'Reporte registrado en Islas Malvinas 639, Coronel Pringles.'
  WHEN 145 THEN 'Reporte registrado en Urquiza 655, Coronel Pringles.'
  WHEN 146 THEN 'Reporte registrado en Italia 166, Coronel Pringles.'
  WHEN 147 THEN 'Reporte registrado en 25 de Mayo 1730, Coronel Pringles.'
  WHEN 148 THEN 'Reporte registrado en Uruguay 218, Coronel Pringles.'
  WHEN 149 THEN 'Reporte registrado en España 138, Coronel Pringles.'
  WHEN 150 THEN 'Reporte registrado en 15 de Julio 156, Coronel Pringles.'
  WHEN 151 THEN 'Reporte registrado en Sáenz Peña 4, Coronel Pringles.'
  WHEN 152 THEN 'Reporte registrado en Alsina 1264, Coronel Pringles.'
  WHEN 153 THEN 'Reporte registrado en Italia 419, Coronel Pringles.'
  WHEN 154 THEN 'Reporte registrado en José Hernández 742, Coronel Pringles.'
  WHEN 155 THEN 'Reporte registrado en Necochea 532, Coronel Pringles.'
  WHEN 156 THEN 'Reporte registrado en Mitre 108, Coronel Pringles.'
  WHEN 157 THEN 'Reporte registrado en José Hernández 9, Coronel Pringles.'
  WHEN 158 THEN 'Reporte registrado en San Martín 697, Coronel Pringles.'
  WHEN 159 THEN 'Reporte registrado en Rodríguez Peña 87, Coronel Pringles.'
  WHEN 160 THEN 'Reporte registrado en Colón 784, Coronel Pringles.'
  WHEN 161 THEN 'Reporte registrado en Rivadavia 544, Coronel Pringles.'
  WHEN 162 THEN 'Reporte registrado en 9 de Julio 1762, Coronel Pringles.'
  WHEN 163 THEN 'Reporte registrado en Maipú 763, Coronel Pringles.'
  WHEN 164 THEN 'Reporte registrado en Juan XXIII 227, Coronel Pringles.'
  WHEN 165 THEN 'Reporte registrado en Chiclana 613, Coronel Pringles.'
  WHEN 166 THEN 'Reporte registrado en Rivadavia 723, Coronel Pringles.'
  WHEN 167 THEN 'Reporte registrado en Italia 184, Coronel Pringles.'
  WHEN 168 THEN 'Reporte registrado en Maipú 1262, Coronel Pringles.'
  WHEN 169 THEN 'Reporte registrado en España 193, Coronel Pringles.'
  WHEN 170 THEN 'Reporte registrado en Lavalle 230, Coronel Pringles.'
  WHEN 171 THEN 'Reporte registrado en Alsina 508, Coronel Pringles.'
  WHEN 172 THEN 'Reporte registrado en Colón 1052, Coronel Pringles.'
  WHEN 173 THEN 'Reporte registrado en Artigas 406, Coronel Pringles.'
  WHEN 174 THEN 'Reporte registrado en Pellegrini 537, Coronel Pringles.'
  WHEN 175 THEN 'Reporte registrado en Islas Malvinas 547, Coronel Pringles.'
  WHEN 176 THEN 'Reporte registrado en Chiclana 59, Coronel Pringles.'
  WHEN 177 THEN 'Reporte registrado en Bahía Blanca 1638, Coronel Pringles.'
  WHEN 178 THEN 'Reporte registrado en Islas Malvinas 869, Coronel Pringles.'
  WHEN 179 THEN 'Reporte registrado en España 52, Coronel Pringles.'
  WHEN 180 THEN 'Reporte registrado en Mitre 536, Coronel Pringles.'
  WHEN 181 THEN 'Reporte registrado en Sáenz Peña 60, Coronel Pringles.'
  WHEN 182 THEN 'Reporte registrado en 25 de Mayo 271, Coronel Pringles.'
  WHEN 183 THEN 'Reporte registrado en Bahía Blanca 1085, Coronel Pringles.'
  WHEN 184 THEN 'Reporte registrado en Juan XXIII 496, Coronel Pringles.'
  WHEN 185 THEN 'Reporte registrado en Bahía Blanca 1561, Coronel Pringles.'
  WHEN 186 THEN 'Reporte registrado en 24 de Septiembre 566, Coronel Pringles.'
  WHEN 187 THEN 'Reporte registrado en Garay 1220, Coronel Pringles.'
  WHEN 188 THEN 'Reporte registrado en General Paz 396, Coronel Pringles.'
  WHEN 189 THEN 'Reporte registrado en Alvear 561, Coronel Pringles.'
  WHEN 190 THEN 'Reporte registrado en Moreno 1101, Coronel Pringles.'
  WHEN 191 THEN 'Reporte registrado en San Martín 107, Coronel Pringles.'
  WHEN 192 THEN 'Reporte registrado en Avellaneda 692, Coronel Pringles.'
  WHEN 193 THEN 'Reporte registrado en Moreno 535, Coronel Pringles.'
  WHEN 194 THEN 'Reporte registrado en Artigas 647, Coronel Pringles.'
  WHEN 195 THEN 'Reporte registrado en Chacabuco 284, Coronel Pringles.'
  WHEN 196 THEN 'Reporte registrado en Urquiza 988, Coronel Pringles.'
  WHEN 197 THEN 'Reporte registrado en Tucumán 1149, Coronel Pringles.'
  WHEN 198 THEN 'Reporte registrado en Moreno 577, Coronel Pringles.'
  WHEN 199 THEN 'Reporte registrado en General Paz 144, Coronel Pringles.'
  WHEN 200 THEN 'Reporte registrado en Brown 302, Coronel Pringles.'
  WHEN 201 THEN 'Reporte registrado en Colón 1541, Coronel Pringles.'
  WHEN 202 THEN 'Reporte registrado en Sáenz Peña 204, Coronel Pringles.'
  WHEN 203 THEN 'Reporte registrado en Artigas 134, Coronel Pringles.'
  WHEN 204 THEN 'Reporte registrado en Suárez 628, Coronel Pringles.'
  WHEN 205 THEN 'Reporte registrado en Garay 98, Coronel Pringles.'
  WHEN 206 THEN 'Reporte registrado en Necochea 818, Coronel Pringles.'
  WHEN 207 THEN 'Reporte registrado en Islas Malvinas 655, Coronel Pringles.'
  WHEN 208 THEN 'Reporte registrado en Italia 218, Coronel Pringles.'
  WHEN 209 THEN 'Reporte registrado en Lavalle 1106, Coronel Pringles.'
  WHEN 210 THEN 'Reporte registrado en Alvear 809, Coronel Pringles.'
  WHEN 211 THEN 'Reporte registrado en Urquiza 1000, Coronel Pringles.'
  WHEN 212 THEN 'Reporte registrado en Dorrego 78, Coronel Pringles.'
  WHEN 213 THEN 'Reporte registrado en Garay 1145, Coronel Pringles.'
  WHEN 214 THEN 'Reporte registrado en Moreno 1270, Coronel Pringles.'
  WHEN 215 THEN 'Reporte registrado en Chiclana 655, Coronel Pringles.'
  WHEN 216 THEN 'Reporte registrado en Dorrego 541, Coronel Pringles.'
  WHEN 217 THEN 'Reporte registrado en Brown 69, Coronel Pringles.'
  WHEN 218 THEN 'Reporte registrado en Sarmiento 1444, Coronel Pringles.'
  WHEN 219 THEN 'Reporte registrado en 15 de Julio 1, Coronel Pringles.'
  WHEN 220 THEN 'Reporte registrado en Lavalle 933, Coronel Pringles.'
  WHEN 221 THEN 'Reporte registrado en Garay 374, Coronel Pringles.'
  WHEN 222 THEN 'Reporte registrado en Juan XXIII 701, Coronel Pringles.'
  WHEN 223 THEN 'Reporte registrado en Uruguay 359, Coronel Pringles.'
  WHEN 224 THEN 'Reporte registrado en Necochea 359, Coronel Pringles.'
  WHEN 225 THEN 'Reporte registrado en Roca 1178, Coronel Pringles.'
  WHEN 226 THEN 'Reporte registrado en Sáenz Peña 998, Coronel Pringles.'
  WHEN 227 THEN 'Reporte registrado en Urquiza 926, Coronel Pringles.'
  WHEN 228 THEN 'Reporte registrado en Colón 45, Coronel Pringles.'
  WHEN 229 THEN 'Reporte registrado en Pellegrini 545, Coronel Pringles.'
  WHEN 230 THEN 'Reporte registrado en Rodríguez Peña 81, Coronel Pringles.'
  WHEN 231 THEN 'Reporte registrado en Roca 50, Coronel Pringles.'
  WHEN 232 THEN 'Reporte registrado en España 500, Coronel Pringles.'
  WHEN 233 THEN 'Reporte registrado en 24 de Septiembre 307, Coronel Pringles.'
  WHEN 234 THEN 'Reporte registrado en Garay 409, Coronel Pringles.'
  WHEN 235 THEN 'Reporte registrado en San Martín 628, Coronel Pringles.'
  WHEN 236 THEN 'Reporte registrado en 24 de Septiembre 610, Coronel Pringles.'
  WHEN 237 THEN 'Reporte registrado en Rodríguez Peña 826, Coronel Pringles.'
  WHEN 238 THEN 'Reporte registrado en Roca 138, Coronel Pringles.'
  WHEN 239 THEN 'Reporte registrado en Alvear 1305, Coronel Pringles.'
  WHEN 240 THEN 'Reporte registrado en Rodríguez Peña 61, Coronel Pringles.'
  WHEN 241 THEN 'Reporte registrado en Alsina 986, Coronel Pringles.'
  WHEN 242 THEN 'Reporte registrado en Hipólito Yrigoyen 199, Coronel Pringles.'
  WHEN 243 THEN 'Reporte registrado en Garay 138, Coronel Pringles.'
  WHEN 244 THEN 'Reporte registrado en Roca 402, Coronel Pringles.'
  WHEN 245 THEN 'Reporte registrado en Juan XXIII 600, Coronel Pringles.'
  WHEN 246 THEN 'Reporte registrado en Juan XXIII 69, Coronel Pringles.'
  WHEN 247 THEN 'Reporte registrado en Urquiza 4, Coronel Pringles.'
  WHEN 248 THEN 'Reporte registrado en 15 de Julio 17, Coronel Pringles.'
  WHEN 249 THEN 'Reporte registrado en Rodríguez Peña 31, Coronel Pringles.'
  WHEN 250 THEN 'Reporte registrado en Roca 48, Coronel Pringles.'
  WHEN 251 THEN 'Reporte registrado en 24 de Septiembre 300, Coronel Pringles.'
  WHEN 252 THEN 'Reporte registrado en Avellaneda 31, Coronel Pringles.'
  WHEN 253 THEN 'Reporte registrado en Rivadavia 156, Coronel Pringles.'
  WHEN 254 THEN 'Reporte registrado en Chiclana 1062, Coronel Pringles.'
  WHEN 255 THEN 'Reporte registrado en España 949, Coronel Pringles.'
  WHEN 256 THEN 'Reporte registrado en 25 de Mayo 209, Coronel Pringles.'
  WHEN 257 THEN 'Reporte registrado en José Ingenieros 40, Coronel Pringles.'
  WHEN 258 THEN 'Reporte registrado en Mitre 1450, Coronel Pringles.'
  WHEN 259 THEN 'Reporte registrado en San Martín 1701, Coronel Pringles.'
  WHEN 260 THEN 'Reporte registrado en 25 de Mayo 1747, Coronel Pringles.'
  WHEN 261 THEN 'Reporte registrado en General Paz 408, Coronel Pringles.'
  WHEN 262 THEN 'Reporte registrado en Alvear 451, Coronel Pringles.'
  WHEN 263 THEN 'Reporte registrado en Bahía Blanca 291, Coronel Pringles.'
  WHEN 264 THEN 'Reporte registrado en Garay 4, Coronel Pringles.'
  WHEN 265 THEN 'Reporte registrado en Maipú 1186, Coronel Pringles.'
  WHEN 266 THEN 'Reporte registrado en Sáenz Peña 76, Coronel Pringles.'
  WHEN 267 THEN 'Reporte registrado en Francia 266, Coronel Pringles.'
  WHEN 268 THEN 'Reporte registrado en Roca 377, Coronel Pringles.'
  WHEN 269 THEN 'Reporte registrado en Cabrera 1119, Coronel Pringles.'
  WHEN 270 THEN 'Reporte registrado en Tucumán 127, Coronel Pringles.'
  WHEN 271 THEN 'Reporte registrado en José Ingenieros 264, Coronel Pringles.'
  WHEN 272 THEN 'Reporte registrado en Necochea 339, Coronel Pringles.'
  WHEN 273 THEN 'Reporte registrado en Moreno 68, Coronel Pringles.'
  WHEN 274 THEN 'Reporte registrado en Brown 798, Coronel Pringles.'
  WHEN 275 THEN 'Reporte registrado en Chiclana 605, Coronel Pringles.'
  WHEN 276 THEN 'Reporte registrado en Avellaneda 59, Coronel Pringles.'
  WHEN 277 THEN 'Reporte registrado en Moreno 1304, Coronel Pringles.'
  WHEN 278 THEN 'Reporte registrado en Colón 65, Coronel Pringles.'
  WHEN 279 THEN 'Reporte registrado en Rivadavia 442, Coronel Pringles.'
  WHEN 280 THEN 'Reporte registrado en Sáenz Peña 665, Coronel Pringles.'
  WHEN 281 THEN 'Reporte registrado en Avellaneda 985, Coronel Pringles.'
  WHEN 282 THEN 'Reporte registrado en Cabrera 89, Coronel Pringles.'
  WHEN 283 THEN 'Reporte registrado en Bahía Blanca 335, Coronel Pringles.'
  WHEN 284 THEN 'Reporte registrado en Chacabuco 417, Coronel Pringles.'
  WHEN 285 THEN 'Reporte registrado en Belgrano 298, Coronel Pringles.'
  WHEN 286 THEN 'Reporte registrado en Pellegrini 299, Coronel Pringles.'
  WHEN 287 THEN 'Reporte registrado en España 574, Coronel Pringles.'
  WHEN 288 THEN 'Reporte registrado en Rodríguez Peña 764, Coronel Pringles.'
  WHEN 289 THEN 'Reporte registrado en General Paz 1566, Coronel Pringles.'
  WHEN 290 THEN 'Reporte registrado en Dorrego 25, Coronel Pringles.'
  WHEN 291 THEN 'Reporte registrado en Sarmiento 289, Coronel Pringles.'
  WHEN 292 THEN 'Reporte registrado en 9 de Julio 1205, Coronel Pringles.'
  WHEN 293 THEN 'Reporte registrado en San Martín 285, Coronel Pringles.'
  WHEN 294 THEN 'Reporte registrado en Islas Malvinas 838, Coronel Pringles.'
  WHEN 295 THEN 'Reporte registrado en Francia 512, Coronel Pringles.'
  WHEN 296 THEN 'Reporte registrado en Hipólito Yrigoyen 1151, Coronel Pringles.'
  WHEN 297 THEN 'Reporte registrado en España 477, Coronel Pringles.'
  WHEN 298 THEN 'Reporte registrado en Tucumán 389, Coronel Pringles.'
  WHEN 299 THEN 'Reporte registrado en Sarmiento 276, Coronel Pringles.'
  WHEN 300 THEN 'Reporte registrado en Mitre 1233, Coronel Pringles.'
  WHEN 301 THEN 'Reporte registrado en Francia 1350, Coronel Pringles.'
  WHEN 302 THEN 'Reporte registrado en Chacabuco 955, Coronel Pringles.'
  WHEN 303 THEN 'Reporte registrado en Dorrego 279, Coronel Pringles.'
  WHEN 304 THEN 'Reporte registrado en Necochea 1053, Coronel Pringles.'
  WHEN 305 THEN 'Reporte registrado en Belgrano 1070, Coronel Pringles.'
  WHEN 306 THEN 'Reporte registrado en Chiclana 634, Coronel Pringles.'
  WHEN 307 THEN 'Reporte registrado en Hipólito Yrigoyen 688, Coronel Pringles.'
  WHEN 308 THEN 'Reporte registrado en Chiclana 1525, Coronel Pringles.'
  WHEN 309 THEN 'Reporte registrado en Rodríguez Peña 263, Coronel Pringles.'
  WHEN 310 THEN 'Reporte registrado en General Paz 228, Coronel Pringles.'
  WHEN 311 THEN 'Reporte registrado en José Ingenieros 325, Coronel Pringles.'
  WHEN 312 THEN 'Reporte registrado en Colón 1542, Coronel Pringles.'
  WHEN 313 THEN 'Reporte registrado en Bahía Blanca 91, Coronel Pringles.'
  WHEN 314 THEN 'Reporte registrado en Avellaneda 944, Coronel Pringles.'
  WHEN 315 THEN 'Reporte registrado en General Paz 1212, Coronel Pringles.'
  WHEN 316 THEN 'Reporte registrado en Bahía Blanca 774, Coronel Pringles.'
  WHEN 317 THEN 'Reporte registrado en Dorrego 301, Coronel Pringles.'
  WHEN 318 THEN 'Reporte registrado en Chacabuco 1042, Coronel Pringles.'
  WHEN 319 THEN 'Reporte registrado en General Paz 809, Coronel Pringles.'
  WHEN 320 THEN 'Reporte registrado en Rodríguez Peña 458, Coronel Pringles.'
  WHEN 321 THEN 'Reporte registrado en España 198, Coronel Pringles.'
  WHEN 322 THEN 'Reporte registrado en Bahía Blanca 1529, Coronel Pringles.'
  WHEN 323 THEN 'Reporte registrado en Chacabuco 286, Coronel Pringles.'
  WHEN 324 THEN 'Reporte registrado en Moreno 174, Coronel Pringles.'
  WHEN 325 THEN 'Reporte registrado en Necochea 281, Coronel Pringles.'
  WHEN 326 THEN 'Reporte registrado en 25 de Mayo 405, Coronel Pringles.'
  WHEN 327 THEN 'Reporte registrado en Urquiza 786, Coronel Pringles.'
  WHEN 328 THEN 'Reporte registrado en Brown 386, Coronel Pringles.'
  WHEN 329 THEN 'Reporte registrado en Francia 592, Coronel Pringles.'
  WHEN 330 THEN 'Reporte registrado en 15 de Julio 1492, Coronel Pringles.'
  WHEN 331 THEN 'Reporte registrado en España 1598, Coronel Pringles.'
  WHEN 332 THEN 'Reporte registrado en Juan XXIII 700, Coronel Pringles.'
  WHEN 333 THEN 'Reporte registrado en Colón 861, Coronel Pringles.'
  WHEN 334 THEN 'Reporte registrado en Islas Malvinas 238, Coronel Pringles.'
  WHEN 335 THEN 'Reporte registrado en Lavalle 495, Coronel Pringles.'
  WHEN 336 THEN 'Reporte registrado en Juan XXIII 262, Coronel Pringles.'
  WHEN 337 THEN 'Reporte registrado en 9 de Julio 140, Coronel Pringles.'
  WHEN 338 THEN 'Reporte registrado en Pellegrini 427, Coronel Pringles.'
  WHEN 339 THEN 'Reporte registrado en Pellegrini 524, Coronel Pringles.'
  WHEN 340 THEN 'Reporte registrado en Suárez 307, Coronel Pringles.'
  WHEN 341 THEN 'Reporte registrado en Garay 557, Coronel Pringles.'
  WHEN 342 THEN 'Reporte registrado en Uruguay 579, Coronel Pringles.'
  WHEN 343 THEN 'Reporte registrado en Moreno 509, Coronel Pringles.'
  WHEN 344 THEN 'Reporte registrado en Artigas 593, Coronel Pringles.'
  WHEN 345 THEN 'Reporte registrado en Pellegrini 1305, Coronel Pringles.'
  WHEN 346 THEN 'Reporte registrado en Hipólito Yrigoyen 629, Coronel Pringles.'
  WHEN 347 THEN 'Reporte registrado en 15 de Julio 444, Coronel Pringles.'
  WHEN 348 THEN 'Reporte registrado en General Paz 357, Coronel Pringles.'
  WHEN 349 THEN 'Reporte registrado en Mitre 233, Coronel Pringles.'
  WHEN 350 THEN 'Reporte registrado en Pellegrini 593, Coronel Pringles.'
  WHEN 351 THEN 'Reporte registrado en Maipú 866, Coronel Pringles.'
  WHEN 352 THEN 'Reporte registrado en Suárez 862, Coronel Pringles.'
  WHEN 353 THEN 'Reporte registrado en 15 de Julio 566, Coronel Pringles.'
  WHEN 354 THEN 'Reporte registrado en Chiclana 872, Coronel Pringles.'
  WHEN 355 THEN 'Reporte registrado en Avellaneda 295, Coronel Pringles.'
  WHEN 356 THEN 'Reporte registrado en Juan XXIII 643, Coronel Pringles.'
  WHEN 357 THEN 'Reporte registrado en Alvear 147, Coronel Pringles.'
  WHEN 358 THEN 'Reporte registrado en Italia 999, Coronel Pringles.'
  WHEN 359 THEN 'Reporte registrado en Mitre 152, Coronel Pringles.'
  WHEN 360 THEN 'Reporte registrado en José Hernández 531, Coronel Pringles.'
  WHEN 361 THEN 'Reporte registrado en Alsina 334, Coronel Pringles.'
  WHEN 362 THEN 'Reporte registrado en General Paz 1153, Coronel Pringles.'
  WHEN 363 THEN 'Reporte registrado en 24 de Septiembre 550, Coronel Pringles.'
  WHEN 364 THEN 'Reporte registrado en Garay 1057, Coronel Pringles.'
  WHEN 365 THEN 'Reporte registrado en Chacabuco 165, Coronel Pringles.'
  WHEN 366 THEN 'Reporte registrado en José Hernández 609, Coronel Pringles.'
  WHEN 367 THEN 'Reporte registrado en Chacabuco 396, Coronel Pringles.'
  WHEN 368 THEN 'Reporte registrado en Alvear 65, Coronel Pringles.'
  WHEN 369 THEN 'Reporte registrado en Urquiza 1369, Coronel Pringles.'
  WHEN 370 THEN 'Reporte registrado en Juan XXIII 1068, Coronel Pringles.'
  WHEN 371 THEN 'Reporte registrado en Cabrera 489, Coronel Pringles.'
  WHEN 372 THEN 'Reporte registrado en Dorrego 1379, Coronel Pringles.'
  WHEN 373 THEN 'Reporte registrado en España 143, Coronel Pringles.'
  WHEN 374 THEN 'Reporte registrado en Chiclana 1013, Coronel Pringles.'
  WHEN 375 THEN 'Reporte registrado en Hipólito Yrigoyen 45, Coronel Pringles.'
  WHEN 376 THEN 'Reporte registrado en Roca 267, Coronel Pringles.'
  WHEN 377 THEN 'Reporte registrado en Belgrano 516, Coronel Pringles.'
  WHEN 378 THEN 'Reporte registrado en Italia 7, Coronel Pringles.'
  WHEN 379 THEN 'Reporte registrado en Islas Malvinas 49, Coronel Pringles.'
  WHEN 380 THEN 'Reporte registrado en Chacabuco 1199, Coronel Pringles.'
  WHEN 381 THEN 'Reporte registrado en Cabrera 493, Coronel Pringles.'
  WHEN 382 THEN 'Reporte registrado en Colón 674, Coronel Pringles.'
  WHEN 383 THEN 'Reporte registrado en Lavalle 63, Coronel Pringles.'
  WHEN 384 THEN 'Reporte registrado en España 706, Coronel Pringles.'
  WHEN 385 THEN 'Reporte registrado en Uruguay 369, Coronel Pringles.'
  WHEN 386 THEN 'Reporte registrado en España 886, Coronel Pringles.'
  WHEN 387 THEN 'Reporte registrado en Suárez 248, Coronel Pringles.'
  WHEN 388 THEN 'Reporte registrado en Chacabuco 53, Coronel Pringles.'
  WHEN 389 THEN 'Reporte registrado en Artigas 458, Coronel Pringles.'
  WHEN 390 THEN 'Reporte registrado en Tucumán 175, Coronel Pringles.'
  WHEN 391 THEN 'Reporte registrado en Rivadavia 896, Coronel Pringles.'
  WHEN 392 THEN 'Reporte registrado en Alvear 76, Coronel Pringles.'
  WHEN 393 THEN 'Reporte registrado en Suárez 39, Coronel Pringles.'
  WHEN 394 THEN 'Reporte registrado en Maipú 1074, Coronel Pringles.'
  WHEN 395 THEN 'Reporte registrado en 15 de Julio 488, Coronel Pringles.'
  WHEN 396 THEN 'Reporte registrado en Tucumán 1187, Coronel Pringles.'
  WHEN 397 THEN 'Reporte registrado en Cabrera 471, Coronel Pringles.'
  WHEN 398 THEN 'Reporte registrado en 24 de Septiembre 333, Coronel Pringles.'
  WHEN 399 THEN 'Reporte registrado en Colón 327, Coronel Pringles.'
  WHEN 400 THEN 'Reporte registrado en 9 de Julio 743, Coronel Pringles.'
  WHEN 401 THEN 'Reporte registrado en General Paz 20, Coronel Pringles.'
  WHEN 402 THEN 'Reporte registrado en 15 de Julio 282, Coronel Pringles.'
  WHEN 403 THEN 'Reporte registrado en Bahía Blanca 958, Coronel Pringles.'
  WHEN 404 THEN 'Reporte registrado en Francia 549, Coronel Pringles.'
  WHEN 405 THEN 'Reporte registrado en San Martín 71, Coronel Pringles.'
  WHEN 406 THEN 'Reporte registrado en Francia 660, Coronel Pringles.'
  WHEN 407 THEN 'Reporte registrado en Belgrano 770, Coronel Pringles.'
  WHEN 408 THEN 'Reporte registrado en Urquiza 1319, Coronel Pringles.'
  WHEN 409 THEN 'Reporte registrado en Mitre 1588, Coronel Pringles.'
  WHEN 410 THEN 'Reporte registrado en Bahía Blanca 66, Coronel Pringles.'
  WHEN 411 THEN 'Reporte registrado en 25 de Mayo 729, Coronel Pringles.'
  WHEN 412 THEN 'Reporte registrado en Urquiza 611, Coronel Pringles.'
  WHEN 413 THEN 'Reporte registrado en Moreno 274, Coronel Pringles.'
  WHEN 414 THEN 'Reporte registrado en Rivadavia 134, Coronel Pringles.'
  WHEN 415 THEN 'Reporte registrado en Tucumán 688, Coronel Pringles.'
  WHEN 416 THEN 'Reporte registrado en Islas Malvinas 639, Coronel Pringles.'
  WHEN 417 THEN 'Reporte registrado en 15 de Julio 963, Coronel Pringles.'
  WHEN 418 THEN 'Reporte registrado en Alsina 761, Coronel Pringles.'
  WHEN 419 THEN 'Reporte registrado en Roca 328, Coronel Pringles.'
  WHEN 420 THEN 'Reporte registrado en Avellaneda 177, Coronel Pringles.'
  WHEN 421 THEN 'Reporte registrado en Necochea 523, Coronel Pringles.'
  WHEN 422 THEN 'Reporte registrado en 15 de Julio 159, Coronel Pringles.'
  WHEN 423 THEN 'Reporte registrado en Sarmiento 95, Coronel Pringles.'
  WHEN 424 THEN 'Reporte registrado en Brown 537, Coronel Pringles.'
  WHEN 425 THEN 'Reporte registrado en Lavalle 1392, Coronel Pringles.'
  WHEN 426 THEN 'Reporte registrado en Sáenz Peña 1059, Coronel Pringles.'
  WHEN 427 THEN 'Reporte registrado en Alsina 914, Coronel Pringles.'
  WHEN 428 THEN 'Reporte registrado en Chiclana 530, Coronel Pringles.'
  WHEN 429 THEN 'Reporte registrado en Maipú 683, Coronel Pringles.'
  WHEN 430 THEN 'Reporte registrado en Artigas 542, Coronel Pringles.'
  WHEN 431 THEN 'Reporte registrado en Belgrano 76, Coronel Pringles.'
  WHEN 432 THEN 'Reporte registrado en Chacabuco 348, Coronel Pringles.'
  WHEN 433 THEN 'Reporte registrado en Maipú 1013, Coronel Pringles.'
  WHEN 434 THEN 'Reporte registrado en Dorrego 505, Coronel Pringles.'
  WHEN 435 THEN 'Reporte registrado en Necochea 282, Coronel Pringles.'
  WHEN 436 THEN 'Reporte registrado en Italia 125, Coronel Pringles.'
  WHEN 437 THEN 'Reporte registrado en 24 de Septiembre 1479, Coronel Pringles.'
  WHEN 438 THEN 'Reporte registrado en Italia 356, Coronel Pringles.'
  WHEN 439 THEN 'Reporte registrado en Artigas 497, Coronel Pringles.'
  WHEN 440 THEN 'Reporte registrado en Cabrera 560, Coronel Pringles.'
  WHEN 441 THEN 'Reporte registrado en Cabrera 634, Coronel Pringles.'
  WHEN 442 THEN 'Reporte registrado en Rivadavia 413, Coronel Pringles.'
  WHEN 443 THEN 'Reporte registrado en José Hernández 504, Coronel Pringles.'
  WHEN 444 THEN 'Reporte registrado en Dorrego 348, Coronel Pringles.'
  WHEN 445 THEN 'Reporte registrado en José Ingenieros 302, Coronel Pringles.'
  WHEN 446 THEN 'Reporte registrado en Suárez 217, Coronel Pringles.'
  WHEN 447 THEN 'Reporte registrado en Lavalle 1205, Coronel Pringles.'
  WHEN 448 THEN 'Reporte registrado en Chiclana 317, Coronel Pringles.'
  WHEN 449 THEN 'Reporte registrado en Necochea 494, Coronel Pringles.'
  WHEN 450 THEN 'Reporte registrado en Alsina 172, Coronel Pringles.'
  WHEN 451 THEN 'Reporte registrado en Alsina 114, Coronel Pringles.'
  WHEN 452 THEN 'Reporte registrado en Colón 458, Coronel Pringles.'
  WHEN 453 THEN 'Reporte registrado en Cabrera 320, Coronel Pringles.'
  WHEN 454 THEN 'Reporte registrado en Necochea 663, Coronel Pringles.'
  WHEN 455 THEN 'Reporte registrado en Belgrano 1067, Coronel Pringles.'
  WHEN 456 THEN 'Reporte registrado en Bahía Blanca 1072, Coronel Pringles.'
  WHEN 457 THEN 'Reporte registrado en Bahía Blanca 277, Coronel Pringles.'
  WHEN 458 THEN 'Reporte registrado en Francia 122, Coronel Pringles.'
  WHEN 459 THEN 'Reporte registrado en General Paz 1056, Coronel Pringles.'
  WHEN 460 THEN 'Reporte registrado en Colón 799, Coronel Pringles.'
  WHEN 461 THEN 'Reporte registrado en Alsina 1240, Coronel Pringles.'
  WHEN 462 THEN 'Reporte registrado en Rivadavia 435, Coronel Pringles.'
  WHEN 463 THEN 'Reporte registrado en Lavalle 252, Coronel Pringles.'
  WHEN 464 THEN 'Reporte registrado en Alsina 133, Coronel Pringles.'
  WHEN 465 THEN 'Reporte registrado en Dorrego 424, Coronel Pringles.'
  WHEN 466 THEN 'Reporte registrado en Maipú 57, Coronel Pringles.'
  WHEN 467 THEN 'Reporte registrado en Rodríguez Peña 1087, Coronel Pringles.'
  WHEN 468 THEN 'Reporte registrado en España 932, Coronel Pringles.'
  WHEN 469 THEN 'Reporte registrado en Cabrera 125, Coronel Pringles.'
  WHEN 470 THEN 'Reporte registrado en San Martín 6, Coronel Pringles.'
  WHEN 471 THEN 'Reporte registrado en José Hernández 934, Coronel Pringles.'
  WHEN 472 THEN 'Reporte registrado en Artigas 213, Coronel Pringles.'
  WHEN 473 THEN 'Reporte registrado en Chacabuco 733, Coronel Pringles.'
  WHEN 474 THEN 'Reporte registrado en España 1205, Coronel Pringles.'
  WHEN 475 THEN 'Reporte registrado en Pellegrini 1053, Coronel Pringles.'
  WHEN 476 THEN 'Reporte registrado en Tucumán 375, Coronel Pringles.'
  WHEN 477 THEN 'Reporte registrado en Hipólito Yrigoyen 333, Coronel Pringles.'
  WHEN 478 THEN 'Reporte registrado en Dorrego 468, Coronel Pringles.'
  WHEN 479 THEN 'Reporte registrado en Pellegrini 108, Coronel Pringles.'
  WHEN 480 THEN 'Reporte registrado en Suárez 1022, Coronel Pringles.'
  WHEN 481 THEN 'Reporte registrado en Maipú 812, Coronel Pringles.'
  WHEN 482 THEN 'Reporte registrado en Rodríguez Peña 754, Coronel Pringles.'
  WHEN 483 THEN 'Reporte registrado en Maipú 360, Coronel Pringles.'
  WHEN 484 THEN 'Reporte registrado en Mitre 46, Coronel Pringles.'
  WHEN 485 THEN 'Reporte registrado en Rodríguez Peña 763, Coronel Pringles.'
  WHEN 486 THEN 'Reporte registrado en Islas Malvinas 365, Coronel Pringles.'
  WHEN 487 THEN 'Reporte registrado en Artigas 199, Coronel Pringles.'
  WHEN 488 THEN 'Reporte registrado en 9 de Julio 1081, Coronel Pringles.'
  WHEN 489 THEN 'Reporte registrado en Urquiza 23, Coronel Pringles.'
  WHEN 490 THEN 'Reporte registrado en Hipólito Yrigoyen 273, Coronel Pringles.'
  WHEN 491 THEN 'Reporte registrado en Chacabuco 161, Coronel Pringles.'
  WHEN 492 THEN 'Reporte registrado en Pellegrini 546, Coronel Pringles.'
  WHEN 493 THEN 'Reporte registrado en Garay 122, Coronel Pringles.'
  WHEN 494 THEN 'Reporte registrado en Pellegrini 1135, Coronel Pringles.'
  WHEN 495 THEN 'Reporte registrado en 24 de Septiembre 1445, Coronel Pringles.'
  WHEN 496 THEN 'Reporte registrado en Alsina 861, Coronel Pringles.'
  WHEN 497 THEN 'Reporte registrado en Islas Malvinas 1121, Coronel Pringles.'
  WHEN 498 THEN 'Reporte registrado en Moreno 180, Coronel Pringles.'
  WHEN 499 THEN 'Reporte registrado en Moreno 103, Coronel Pringles.'
  WHEN 500 THEN 'Reporte registrado en Chiclana 288, Coronel Pringles.'
  WHEN 501 THEN 'Reporte registrado en Pellegrini 81, Coronel Pringles.'
  WHEN 502 THEN 'Reporte registrado en José Hernández 288, Coronel Pringles.'
  WHEN 503 THEN 'Reporte registrado en Islas Malvinas 517, Coronel Pringles.'
  WHEN 504 THEN 'Reporte registrado en Brown 212, Coronel Pringles.'
  WHEN 505 THEN 'Reporte registrado en José Hernández 110, Coronel Pringles.'
  WHEN 506 THEN 'Reporte registrado en Sáenz Peña 62, Coronel Pringles.'
  WHEN 507 THEN 'Reporte registrado en 24 de Septiembre 6, Coronel Pringles.'
  WHEN 508 THEN 'Reporte registrado en Maipú 1110, Coronel Pringles.'
  WHEN 509 THEN 'Reporte registrado en 24 de Septiembre 1241, Coronel Pringles.'
  WHEN 510 THEN 'Reporte registrado en Islas Malvinas 1188, Coronel Pringles.'
  WHEN 511 THEN 'Reporte registrado en José Ingenieros 275, Coronel Pringles.'
  WHEN 512 THEN 'Reporte registrado en San Martín 640, Coronel Pringles.'
  WHEN 513 THEN 'Reporte registrado en Avellaneda 489, Coronel Pringles.'
  WHEN 514 THEN 'Reporte registrado en 15 de Julio 382, Coronel Pringles.'
  WHEN 515 THEN 'Reporte registrado en Islas Malvinas 574, Coronel Pringles.'
  WHEN 516 THEN 'Reporte registrado en Roca 439, Coronel Pringles.'
  WHEN 517 THEN 'Reporte registrado en Cabrera 1043, Coronel Pringles.'
  WHEN 518 THEN 'Reporte registrado en San Martín 1196, Coronel Pringles.'
  WHEN 519 THEN 'Reporte registrado en Dorrego 307, Coronel Pringles.'
  WHEN 520 THEN 'Reporte registrado en Alsina 443, Coronel Pringles.'
  WHEN 521 THEN 'Reporte registrado en Bahía Blanca 634, Coronel Pringles.'
  WHEN 522 THEN 'Reporte registrado en Belgrano 1221, Coronel Pringles.'
  WHEN 523 THEN 'Reporte registrado en Cabrera 553, Coronel Pringles.'
  WHEN 524 THEN 'Reporte registrado en Rodríguez Peña 126, Coronel Pringles.'
  WHEN 525 THEN 'Reporte registrado en Juan XXIII 33, Coronel Pringles.'
  WHEN 526 THEN 'Reporte registrado en Rivadavia 652, Coronel Pringles.'
  WHEN 527 THEN 'Reporte registrado en 24 de Septiembre 529, Coronel Pringles.'
  WHEN 528 THEN 'Reporte registrado en Suárez 667, Coronel Pringles.'
  WHEN 529 THEN 'Reporte registrado en Alvear 10, Coronel Pringles.'
  WHEN 530 THEN 'Reporte registrado en Bahía Blanca 1032, Coronel Pringles.'
  WHEN 531 THEN 'Reporte registrado en General Paz 74, Coronel Pringles.'
  WHEN 532 THEN 'Reporte registrado en Belgrano 393, Coronel Pringles.'
  WHEN 533 THEN 'Reporte registrado en Juan XXIII 957, Coronel Pringles.'
  WHEN 534 THEN 'Reporte registrado en Dorrego 660, Coronel Pringles.'
  WHEN 535 THEN 'Reporte registrado en Chacabuco 512, Coronel Pringles.'
  WHEN 536 THEN 'Reporte registrado en Garay 118, Coronel Pringles.'
  WHEN 537 THEN 'Reporte registrado en Chacabuco 309, Coronel Pringles.'
  WHEN 538 THEN 'Reporte registrado en Francia 98, Coronel Pringles.'
  WHEN 539 THEN 'Reporte registrado en Bahía Blanca 392, Coronel Pringles.'
  WHEN 540 THEN 'Reporte registrado en Sarmiento 725, Coronel Pringles.'
  WHEN 541 THEN 'Reporte registrado en Pellegrini 544, Coronel Pringles.'
  WHEN 542 THEN 'Reporte registrado en España 558, Coronel Pringles.'
  WHEN 543 THEN 'Reporte registrado en Chacabuco 1157, Coronel Pringles.'
  WHEN 544 THEN 'Reporte registrado en Colón 536, Coronel Pringles.'
  WHEN 545 THEN 'Reporte registrado en Brown 1314, Coronel Pringles.'
  WHEN 546 THEN 'Reporte registrado en Moreno 234, Coronel Pringles.'
  WHEN 547 THEN 'Reporte registrado en José Ingenieros 679, Coronel Pringles.'
  WHEN 548 THEN 'Reporte registrado en 24 de Septiembre 1493, Coronel Pringles.'
  WHEN 549 THEN 'Reporte registrado en Moreno 663, Coronel Pringles.'
  WHEN 550 THEN 'Reporte registrado en Artigas 1323, Coronel Pringles.'
  WHEN 551 THEN 'Reporte registrado en 25 de Mayo 153, Coronel Pringles.'
  WHEN 552 THEN 'Reporte registrado en 24 de Septiembre 247, Coronel Pringles.'
  WHEN 553 THEN 'Reporte registrado en José Ingenieros 686, Coronel Pringles.'
  WHEN 554 THEN 'Reporte registrado en Alsina 597, Coronel Pringles.'
  WHEN 555 THEN 'Reporte registrado en San Martín 1799, Coronel Pringles.'
  WHEN 556 THEN 'Reporte registrado en Artigas 12, Coronel Pringles.'
  WHEN 557 THEN 'Reporte registrado en España 278, Coronel Pringles.'
  WHEN 558 THEN 'Reporte registrado en Artigas 543, Coronel Pringles.'
  WHEN 559 THEN 'Reporte registrado en Garay 1236, Coronel Pringles.'
  WHEN 560 THEN 'Reporte registrado en Garay 1215, Coronel Pringles.'
  WHEN 561 THEN 'Reporte registrado en José Hernández 1002, Coronel Pringles.'
  WHEN 562 THEN 'Reporte registrado en 24 de Septiembre 1379, Coronel Pringles.'
  WHEN 563 THEN 'Reporte registrado en Chiclana 858, Coronel Pringles.'
  WHEN 564 THEN 'Reporte registrado en General Paz 1717, Coronel Pringles.'
  WHEN 565 THEN 'Reporte registrado en Belgrano 1784, Coronel Pringles.'
  WHEN 566 THEN 'Reporte registrado en Necochea 411, Coronel Pringles.'
  WHEN 567 THEN 'Reporte registrado en General Paz 1616, Coronel Pringles.'
  WHEN 568 THEN 'Reporte registrado en 9 de Julio 849, Coronel Pringles.'
  WHEN 569 THEN 'Reporte registrado en Italia 1225, Coronel Pringles.'
  WHEN 570 THEN 'Reporte registrado en Urquiza 815, Coronel Pringles.'
  WHEN 571 THEN 'Reporte registrado en Artigas 1371, Coronel Pringles.'
  WHEN 572 THEN 'Reporte registrado en Islas Malvinas 582, Coronel Pringles.'
  WHEN 573 THEN 'Reporte registrado en Moreno 333, Coronel Pringles.'
  WHEN 574 THEN 'Reporte registrado en Chacabuco 348, Coronel Pringles.'
  WHEN 575 THEN 'Reporte registrado en Lavalle 1221, Coronel Pringles.'
  WHEN 576 THEN 'Reporte registrado en Chacabuco 1146, Coronel Pringles.'
  WHEN 577 THEN 'Reporte registrado en Garay 71, Coronel Pringles.'
  WHEN 578 THEN 'Reporte registrado en Roca 1009, Coronel Pringles.'
  WHEN 579 THEN 'Reporte registrado en Alvear 369, Coronel Pringles.'
  WHEN 580 THEN 'Reporte registrado en General Paz 274, Coronel Pringles.'
  WHEN 581 THEN 'Reporte registrado en Dorrego 865, Coronel Pringles.'
  WHEN 582 THEN 'Reporte registrado en 24 de Septiembre 547, Coronel Pringles.'
  WHEN 583 THEN 'Reporte registrado en Chiclana 633, Coronel Pringles.'
  WHEN 584 THEN 'Reporte registrado en Necochea 608, Coronel Pringles.'
  WHEN 585 THEN 'Reporte registrado en José Hernández 27, Coronel Pringles.'
  WHEN 586 THEN 'Reporte registrado en Pellegrini 696, Coronel Pringles.'
  WHEN 587 THEN 'Reporte registrado en 15 de Julio 756, Coronel Pringles.'
  WHEN 588 THEN 'Reporte registrado en Urquiza 1133, Coronel Pringles.'
  WHEN 589 THEN 'Reporte registrado en España 823, Coronel Pringles.'
  WHEN 590 THEN 'Reporte registrado en Avellaneda 597, Coronel Pringles.'
  WHEN 591 THEN 'Reporte registrado en Suárez 891, Coronel Pringles.'
  WHEN 592 THEN 'Reporte registrado en 24 de Septiembre 235, Coronel Pringles.'
  WHEN 593 THEN 'Reporte registrado en Rodríguez Peña 28, Coronel Pringles.'
  WHEN 594 THEN 'Reporte registrado en Belgrano 159, Coronel Pringles.'
  WHEN 595 THEN 'Reporte registrado en Chiclana 385, Coronel Pringles.'
  WHEN 596 THEN 'Reporte registrado en Necochea 135, Coronel Pringles.'
  WHEN 597 THEN 'Reporte registrado en Chiclana 834, Coronel Pringles.'
  WHEN 598 THEN 'Reporte registrado en Alsina 183, Coronel Pringles.'
  WHEN 599 THEN 'Reporte registrado en Hipólito Yrigoyen 68, Coronel Pringles.'
  WHEN 600 THEN 'Reporte registrado en Suárez 1430, Coronel Pringles.'
  WHEN 601 THEN 'Reporte registrado en José Ingenieros 336, Coronel Pringles.'
  WHEN 602 THEN 'Reporte registrado en Alvear 494, Coronel Pringles.'
  WHEN 603 THEN 'Reporte registrado en Garay 899, Coronel Pringles.'
  WHEN 604 THEN 'Reporte registrado en José Ingenieros 217, Coronel Pringles.'
  WHEN 605 THEN 'Reporte registrado en 9 de Julio 550, Coronel Pringles.'
  WHEN 606 THEN 'Reporte registrado en Juan XXIII 198, Coronel Pringles.'
  WHEN 607 THEN 'Reporte registrado en 24 de Septiembre 731, Coronel Pringles.'
  WHEN 608 THEN 'Reporte registrado en José Hernández 431, Coronel Pringles.'
  WHEN 609 THEN 'Reporte registrado en Hipólito Yrigoyen 1135, Coronel Pringles.'
  WHEN 610 THEN 'Reporte registrado en Roca 213, Coronel Pringles.'
  WHEN 611 THEN 'Reporte registrado en Necochea 517, Coronel Pringles.'
  WHEN 612 THEN 'Reporte registrado en Roca 177, Coronel Pringles.'
  WHEN 613 THEN 'Reporte registrado en Alsina 251, Coronel Pringles.'
  WHEN 614 THEN 'Reporte registrado en Roca 13, Coronel Pringles.'
  WHEN 615 THEN 'Reporte registrado en 9 de Julio 18, Coronel Pringles.'
  WHEN 616 THEN 'Reporte registrado en José Hernández 16, Coronel Pringles.'
  WHEN 617 THEN 'Reporte registrado en Francia 201, Coronel Pringles.'
  WHEN 618 THEN 'Reporte registrado en España 203, Coronel Pringles.'
  WHEN 619 THEN 'Reporte registrado en Suárez 861, Coronel Pringles.'
  WHEN 620 THEN 'Reporte registrado en España 519, Coronel Pringles.'
  WHEN 621 THEN 'Reporte registrado en Tucumán 152, Coronel Pringles.'
  WHEN 622 THEN 'Reporte registrado en Sarmiento 607, Coronel Pringles.'
  WHEN 623 THEN 'Reporte registrado en 9 de Julio 571, Coronel Pringles.'
  WHEN 624 THEN 'Reporte registrado en Sarmiento 558, Coronel Pringles.'
  WHEN 625 THEN 'Reporte registrado en Maipú 51, Coronel Pringles.'
  WHEN 626 THEN 'Reporte registrado en Garay 1257, Coronel Pringles.'
  WHEN 627 THEN 'Reporte registrado en José Hernández 52, Coronel Pringles.'
  WHEN 628 THEN 'Reporte registrado en Avellaneda 945, Coronel Pringles.'
  WHEN 629 THEN 'Reporte registrado en Bahía Blanca 468, Coronel Pringles.'
  WHEN 630 THEN 'Reporte registrado en Mitre 167, Coronel Pringles.'
  WHEN 631 THEN 'Reporte registrado en José Ingenieros 265, Coronel Pringles.'
  WHEN 632 THEN 'Reporte registrado en Hipólito Yrigoyen 312, Coronel Pringles.'
  WHEN 633 THEN 'Reporte registrado en Chacabuco 295, Coronel Pringles.'
  WHEN 634 THEN 'Reporte registrado en Tucumán 1062, Coronel Pringles.'
  WHEN 635 THEN 'Reporte registrado en 24 de Septiembre 219, Coronel Pringles.'
  WHEN 636 THEN 'Reporte registrado en Maipú 423, Coronel Pringles.'
  WHEN 637 THEN 'Reporte registrado en Urquiza 379, Coronel Pringles.'
  WHEN 638 THEN 'Reporte registrado en 24 de Septiembre 209, Coronel Pringles.'
  WHEN 639 THEN 'Reporte registrado en Juan XXIII 946, Coronel Pringles.'
  WHEN 640 THEN 'Reporte registrado en Sarmiento 551, Coronel Pringles.'
  WHEN 641 THEN 'Reporte registrado en Chacabuco 280, Coronel Pringles.'
  WHEN 642 THEN 'Reporte registrado en 25 de Mayo 238, Coronel Pringles.'
  WHEN 643 THEN 'Reporte registrado en Artigas 1136, Coronel Pringles.'
  WHEN 644 THEN 'Reporte registrado en Sarmiento 222, Coronel Pringles.'
  WHEN 645 THEN 'Reporte registrado en Alsina 581, Coronel Pringles.'
  WHEN 646 THEN 'Reporte registrado en José Ingenieros 79, Coronel Pringles.'
  WHEN 647 THEN 'Reporte registrado en Rodríguez Peña 48, Coronel Pringles.'
  WHEN 648 THEN 'Reporte registrado en Sarmiento 839, Coronel Pringles.'
  WHEN 649 THEN 'Reporte registrado en Rivadavia 488, Coronel Pringles.'
  WHEN 650 THEN 'Reporte registrado en General Paz 1351, Coronel Pringles.'
  WHEN 651 THEN 'Reporte registrado en Rivadavia 310, Coronel Pringles.'
  WHEN 652 THEN 'Reporte registrado en Rodríguez Peña 953, Coronel Pringles.'
  WHEN 653 THEN 'Reporte registrado en Italia 128, Coronel Pringles.'
  WHEN 654 THEN 'Reporte registrado en José Hernández 83, Coronel Pringles.'
  WHEN 655 THEN 'Reporte registrado en Hipólito Yrigoyen 540, Coronel Pringles.'
  WHEN 656 THEN 'Reporte registrado en Tucumán 90, Coronel Pringles.'
  WHEN 657 THEN 'Reporte registrado en Sarmiento 158, Coronel Pringles.'
  WHEN 658 THEN 'Reporte registrado en Artigas 691, Coronel Pringles.'
  WHEN 659 THEN 'Reporte registrado en Alsina 438, Coronel Pringles.'
  WHEN 660 THEN 'Reporte registrado en Necochea 473, Coronel Pringles.'
  WHEN 661 THEN 'Reporte registrado en Hipólito Yrigoyen 1285, Coronel Pringles.'
  WHEN 662 THEN 'Reporte registrado en Cabrera 661, Coronel Pringles.'
  WHEN 663 THEN 'Reporte registrado en Moreno 809, Coronel Pringles.'
  WHEN 664 THEN 'Reporte registrado en Hipólito Yrigoyen 690, Coronel Pringles.'
  WHEN 665 THEN 'Reporte registrado en Suárez 495, Coronel Pringles.'
  WHEN 666 THEN 'Reporte registrado en Chiclana 576, Coronel Pringles.'
  WHEN 667 THEN 'Reporte registrado en Roca 2035, Coronel Pringles.'
  WHEN 668 THEN 'Reporte registrado en Sáenz Peña 1277, Coronel Pringles.'
  WHEN 669 THEN 'Reporte registrado en Pellegrini 493, Coronel Pringles.'
  WHEN 670 THEN 'Reporte registrado en Rodríguez Peña 26, Coronel Pringles.'
  WHEN 671 THEN 'Reporte registrado en José Hernández 244, Coronel Pringles.'
  WHEN 672 THEN 'Reporte registrado en Roca 1156, Coronel Pringles.'
  WHEN 673 THEN 'Reporte registrado en 25 de Mayo 510, Coronel Pringles.'
  WHEN 674 THEN 'Reporte registrado en Uruguay 22, Coronel Pringles.'
  WHEN 675 THEN 'Reporte registrado en General Paz 1079, Coronel Pringles.'
  WHEN 676 THEN 'Reporte registrado en 24 de Septiembre 129, Coronel Pringles.'
  WHEN 677 THEN 'Reporte registrado en Islas Malvinas 462, Coronel Pringles.'
  WHEN 678 THEN 'Reporte registrado en Cabrera 731, Coronel Pringles.'
  WHEN 679 THEN 'Reporte registrado en Brown 394, Coronel Pringles.'
  WHEN 680 THEN 'Reporte registrado en Rivadavia 439, Coronel Pringles.'
  WHEN 681 THEN 'Reporte registrado en Maipú 75, Coronel Pringles.'
  WHEN 682 THEN 'Reporte registrado en Necochea 608, Coronel Pringles.'
  WHEN 683 THEN 'Reporte registrado en Bahía Blanca 1455, Coronel Pringles.'
  WHEN 684 THEN 'Reporte registrado en Italia 1015, Coronel Pringles.'
  WHEN 685 THEN 'Reporte registrado en España 337, Coronel Pringles.'
  WHEN 686 THEN 'Reporte registrado en Sáenz Peña 22, Coronel Pringles.'
  WHEN 687 THEN 'Reporte registrado en Moreno 99, Coronel Pringles.'
  WHEN 688 THEN 'Reporte registrado en Avellaneda 555, Coronel Pringles.'
  WHEN 689 THEN 'Reporte registrado en Moreno 56, Coronel Pringles.'
  WHEN 690 THEN 'Reporte registrado en Avellaneda 347, Coronel Pringles.'
  WHEN 691 THEN 'Reporte registrado en Belgrano 1186, Coronel Pringles.'
  WHEN 692 THEN 'Reporte registrado en José Ingenieros 202, Coronel Pringles.'
  WHEN 693 THEN 'Reporte registrado en Sarmiento 1150, Coronel Pringles.'
  WHEN 694 THEN 'Reporte registrado en Juan XXIII 812, Coronel Pringles.'
  WHEN 695 THEN 'Reporte registrado en Garay 644, Coronel Pringles.'
  WHEN 696 THEN 'Reporte registrado en Alvear 758, Coronel Pringles.'
  WHEN 697 THEN 'Reporte registrado en Avellaneda 248, Coronel Pringles.'
  WHEN 698 THEN 'Reporte registrado en Artigas 278, Coronel Pringles.'
  WHEN 699 THEN 'Reporte registrado en Avellaneda 981, Coronel Pringles.'
  WHEN 700 THEN 'Reporte registrado en Necochea 949, Coronel Pringles.'
  WHEN 701 THEN 'Reporte registrado en José Ingenieros 184, Coronel Pringles.'
  WHEN 702 THEN 'Reporte registrado en Mitre 50, Coronel Pringles.'
  WHEN 703 THEN 'Reporte registrado en Uruguay 73, Coronel Pringles.'
  WHEN 704 THEN 'Reporte registrado en General Paz 1725, Coronel Pringles.'
  WHEN 705 THEN 'Reporte registrado en Juan XXIII 297, Coronel Pringles.'
  WHEN 706 THEN 'Reporte registrado en Alvear 388, Coronel Pringles.'
  WHEN 707 THEN 'Reporte registrado en Uruguay 1076, Coronel Pringles.'
  WHEN 708 THEN 'Reporte registrado en Necochea 113, Coronel Pringles.'
  WHEN 709 THEN 'Reporte registrado en Alsina 1025, Coronel Pringles.'
  WHEN 710 THEN 'Reporte registrado en San Martín 15, Coronel Pringles.'
  WHEN 711 THEN 'Reporte registrado en 25 de Mayo 54, Coronel Pringles.'
  WHEN 712 THEN 'Reporte registrado en Alvear 649, Coronel Pringles.'
  WHEN 713 THEN 'Reporte registrado en Tucumán 855, Coronel Pringles.'
  WHEN 714 THEN 'Reporte registrado en Roca 525, Coronel Pringles.'
  WHEN 715 THEN 'Reporte registrado en 24 de Septiembre 218, Coronel Pringles.'
  WHEN 716 THEN 'Reporte registrado en Juan XXIII 1030, Coronel Pringles.'
  WHEN 717 THEN 'Reporte registrado en Urquiza 566, Coronel Pringles.'
  WHEN 718 THEN 'Reporte registrado en Garay 776, Coronel Pringles.'
  WHEN 719 THEN 'Reporte registrado en Lavalle 575, Coronel Pringles.'
  WHEN 720 THEN 'Reporte registrado en Alvear 655, Coronel Pringles.'
  WHEN 721 THEN 'Reporte registrado en España 152, Coronel Pringles.'
  WHEN 722 THEN 'Reporte registrado en Moreno 168, Coronel Pringles.'
  WHEN 723 THEN 'Reporte registrado en Alsina 202, Coronel Pringles.'
  WHEN 724 THEN 'Reporte registrado en España 123, Coronel Pringles.'
  WHEN 725 THEN 'Reporte registrado en Cabrera 348, Coronel Pringles.'
  WHEN 726 THEN 'Reporte registrado en Islas Malvinas 62, Coronel Pringles.'
  WHEN 727 THEN 'Reporte registrado en Rodríguez Peña 611, Coronel Pringles.'
  WHEN 728 THEN 'Reporte registrado en Bahía Blanca 600, Coronel Pringles.'
  WHEN 729 THEN 'Reporte registrado en 15 de Julio 350, Coronel Pringles.'
  WHEN 730 THEN 'Reporte registrado en Brown 37, Coronel Pringles.'
  WHEN 731 THEN 'Reporte registrado en Sarmiento 572, Coronel Pringles.'
  WHEN 732 THEN 'Reporte registrado en Sáenz Peña 437, Coronel Pringles.'
  WHEN 733 THEN 'Reporte registrado en Garay 1162, Coronel Pringles.'
  WHEN 734 THEN 'Reporte registrado en Francia 1303, Coronel Pringles.'
  WHEN 735 THEN 'Reporte registrado en Mitre 1779, Coronel Pringles.'
  WHEN 736 THEN 'Reporte registrado en Roca 512, Coronel Pringles.'
  WHEN 737 THEN 'Reporte registrado en 15 de Julio 625, Coronel Pringles.'
  WHEN 738 THEN 'Reporte registrado en Maipú 354, Coronel Pringles.'
  WHEN 739 THEN 'Reporte registrado en Colón 907, Coronel Pringles.'
  WHEN 740 THEN 'Reporte registrado en Roca 66, Coronel Pringles.'
  WHEN 741 THEN 'Reporte registrado en Francia 764, Coronel Pringles.'
  WHEN 742 THEN 'Reporte registrado en Uruguay 189, Coronel Pringles.'
  WHEN 743 THEN 'Reporte registrado en Tucumán 816, Coronel Pringles.'
  WHEN 744 THEN 'Reporte registrado en Italia 475, Coronel Pringles.'
  WHEN 745 THEN 'Reporte registrado en Islas Malvinas 854, Coronel Pringles.'
  WHEN 746 THEN 'Reporte registrado en Avellaneda 149, Coronel Pringles.'
  WHEN 747 THEN 'Reporte registrado en 25 de Mayo 358, Coronel Pringles.'
  WHEN 748 THEN 'Reporte registrado en Urquiza 541, Coronel Pringles.'
  WHEN 749 THEN 'Reporte registrado en José Ingenieros 154, Coronel Pringles.'
  WHEN 750 THEN 'Reporte registrado en Rodríguez Peña 104, Coronel Pringles.'
  WHEN 751 THEN 'Reporte registrado en Francia 252, Coronel Pringles.'
  WHEN 752 THEN 'Reporte registrado en José Ingenieros 899, Coronel Pringles.'
  WHEN 753 THEN 'Reporte registrado en 15 de Julio 383, Coronel Pringles.'
  WHEN 754 THEN 'Reporte registrado en Uruguay 248, Coronel Pringles.'
  WHEN 755 THEN 'Reporte registrado en Brown 1548, Coronel Pringles.'
  WHEN 756 THEN 'Reporte registrado en 25 de Mayo 299, Coronel Pringles.'
  WHEN 757 THEN 'Reporte registrado en Brown 8, Coronel Pringles.'
  WHEN 758 THEN 'Reporte registrado en Urquiza 1287, Coronel Pringles.'
  WHEN 759 THEN 'Reporte registrado en Necochea 250, Coronel Pringles.'
  WHEN 760 THEN 'Reporte registrado en Francia 306, Coronel Pringles.'
  WHEN 761 THEN 'Reporte registrado en Necochea 191, Coronel Pringles.'
  WHEN 762 THEN 'Reporte registrado en José Hernández 82, Coronel Pringles.'
  WHEN 763 THEN 'Reporte registrado en Dorrego 1511, Coronel Pringles.'
  WHEN 764 THEN 'Reporte registrado en Sáenz Peña 119, Coronel Pringles.'
  WHEN 765 THEN 'Reporte registrado en Brown 374, Coronel Pringles.'
  WHEN 766 THEN 'Reporte registrado en Belgrano 79, Coronel Pringles.'
  WHEN 767 THEN 'Reporte registrado en Mitre 98, Coronel Pringles.'
  WHEN 768 THEN 'Reporte registrado en Alvear 172, Coronel Pringles.'
  WHEN 769 THEN 'Reporte registrado en Lavalle 1333, Coronel Pringles.'
  WHEN 770 THEN 'Reporte registrado en Cabrera 224, Coronel Pringles.'
  WHEN 771 THEN 'Reporte registrado en Cabrera 247, Coronel Pringles.'
  WHEN 772 THEN 'Reporte registrado en Juan XXIII 137, Coronel Pringles.'
  WHEN 773 THEN 'Reporte registrado en Italia 1004, Coronel Pringles.'
  WHEN 774 THEN 'Reporte registrado en Uruguay 126, Coronel Pringles.'
  WHEN 775 THEN 'Reporte registrado en 25 de Mayo 915, Coronel Pringles.'
  WHEN 776 THEN 'Reporte registrado en Tucumán 250, Coronel Pringles.'
  WHEN 777 THEN 'Reporte registrado en Brown 1562, Coronel Pringles.'
  WHEN 778 THEN 'Reporte registrado en Urquiza 119, Coronel Pringles.'
  WHEN 779 THEN 'Reporte registrado en Tucumán 391, Coronel Pringles.'
  WHEN 780 THEN 'Reporte registrado en Islas Malvinas 268, Coronel Pringles.'
  WHEN 781 THEN 'Reporte registrado en Artigas 304, Coronel Pringles.'
  WHEN 782 THEN 'Reporte registrado en Mitre 346, Coronel Pringles.'
  WHEN 783 THEN 'Reporte registrado en Garay 805, Coronel Pringles.'
  WHEN 784 THEN 'Reporte registrado en Juan XXIII 136, Coronel Pringles.'
  WHEN 785 THEN 'Reporte registrado en 25 de Mayo 393, Coronel Pringles.'
  WHEN 786 THEN 'Reporte registrado en 15 de Julio 242, Coronel Pringles.'
  WHEN 787 THEN 'Reporte registrado en Tucumán 592, Coronel Pringles.'
  WHEN 788 THEN 'Reporte registrado en José Ingenieros 414, Coronel Pringles.'
  WHEN 789 THEN 'Reporte registrado en Maipú 574, Coronel Pringles.'
  WHEN 790 THEN 'Reporte registrado en Tucumán 223, Coronel Pringles.'
  WHEN 791 THEN 'Reporte registrado en Juan XXIII 625, Coronel Pringles.'
  WHEN 792 THEN 'Reporte registrado en 24 de Septiembre 287, Coronel Pringles.'
  WHEN 793 THEN 'Reporte registrado en Brown 253, Coronel Pringles.'
  WHEN 794 THEN 'Reporte registrado en José Hernández 583, Coronel Pringles.'
  WHEN 795 THEN 'Reporte registrado en Artigas 273, Coronel Pringles.'
  WHEN 796 THEN 'Reporte registrado en Cabrera 54, Coronel Pringles.'
  WHEN 797 THEN 'Reporte registrado en Chacabuco 1105, Coronel Pringles.'
  WHEN 798 THEN 'Reporte registrado en Chacabuco 188, Coronel Pringles.'
  WHEN 799 THEN 'Reporte registrado en Rivadavia 507, Coronel Pringles.'
  WHEN 800 THEN 'Reporte registrado en 15 de Julio 328, Coronel Pringles.'
  WHEN 801 THEN 'Reporte registrado en Urquiza 510, Coronel Pringles.'
  WHEN 802 THEN 'Reporte registrado en Necochea 77, Coronel Pringles.'
  WHEN 803 THEN 'Reporte registrado en Alsina 1322, Coronel Pringles.'
  WHEN 804 THEN 'Reporte registrado en Islas Malvinas 146, Coronel Pringles.'
  WHEN 805 THEN 'Reporte registrado en Italia 499, Coronel Pringles.'
  WHEN 806 THEN 'Reporte registrado en Suárez 120, Coronel Pringles.'
  WHEN 807 THEN 'Reporte registrado en Chiclana 608, Coronel Pringles.'
  WHEN 808 THEN 'Reporte registrado en Colón 663, Coronel Pringles.'
  WHEN 809 THEN 'Reporte registrado en Dorrego 83, Coronel Pringles.'
  WHEN 810 THEN 'Reporte registrado en Bahía Blanca 812, Coronel Pringles.'
  WHEN 811 THEN 'Reporte registrado en Alvear 340, Coronel Pringles.'
  WHEN 812 THEN 'Reporte registrado en José Ingenieros 655, Coronel Pringles.'
  WHEN 813 THEN 'Reporte registrado en Avellaneda 193, Coronel Pringles.'
  WHEN 814 THEN 'Reporte registrado en Pellegrini 433, Coronel Pringles.'
  WHEN 815 THEN 'Reporte registrado en Moreno 957, Coronel Pringles.'
  WHEN 816 THEN 'Reporte registrado en Italia 221, Coronel Pringles.'
  WHEN 817 THEN 'Reporte registrado en Garay 529, Coronel Pringles.'
  WHEN 818 THEN 'Reporte registrado en Pellegrini 647, Coronel Pringles.'
  WHEN 819 THEN 'Reporte registrado en Necochea 43, Coronel Pringles.'
  WHEN 820 THEN 'Reporte registrado en Belgrano 106, Coronel Pringles.'
  WHEN 821 THEN 'Reporte registrado en 24 de Septiembre 330, Coronel Pringles.'
  WHEN 822 THEN 'Reporte registrado en Mitre 565, Coronel Pringles.'
  WHEN 823 THEN 'Reporte registrado en Brown 198, Coronel Pringles.'
  WHEN 824 THEN 'Reporte registrado en 25 de Mayo 945, Coronel Pringles.'
  WHEN 825 THEN 'Reporte registrado en Pellegrini 153, Coronel Pringles.'
  WHEN 826 THEN 'Reporte registrado en 9 de Julio 241, Coronel Pringles.'
  WHEN 827 THEN 'Reporte registrado en Mitre 210, Coronel Pringles.'
  WHEN 828 THEN 'Reporte registrado en Cabrera 418, Coronel Pringles.'
  WHEN 829 THEN 'Reporte registrado en Sarmiento 109, Coronel Pringles.'
  WHEN 830 THEN 'Reporte registrado en Colón 279, Coronel Pringles.'
  WHEN 831 THEN 'Reporte registrado en Roca 381, Coronel Pringles.'
  WHEN 832 THEN 'Reporte registrado en Pellegrini 273, Coronel Pringles.'
  WHEN 833 THEN 'Reporte registrado en Maipú 557, Coronel Pringles.'
  WHEN 834 THEN 'Reporte registrado en Garay 222, Coronel Pringles.'
  WHEN 835 THEN 'Reporte registrado en Uruguay 961, Coronel Pringles.'
  WHEN 836 THEN 'Reporte registrado en José Ingenieros 55, Coronel Pringles.'
  WHEN 837 THEN 'Reporte registrado en Islas Malvinas 560, Coronel Pringles.'
  WHEN 838 THEN 'Reporte registrado en España 75, Coronel Pringles.'
  WHEN 839 THEN 'Reporte registrado en Colón 679, Coronel Pringles.'
  WHEN 840 THEN 'Reporte registrado en Uruguay 276, Coronel Pringles.'
  WHEN 841 THEN 'Reporte registrado en Colón 900, Coronel Pringles.'
  WHEN 842 THEN 'Reporte registrado en 15 de Julio 534, Coronel Pringles.'
  WHEN 843 THEN 'Reporte registrado en 15 de Julio 107, Coronel Pringles.'
  WHEN 844 THEN 'Reporte registrado en Mitre 514, Coronel Pringles.'
  WHEN 845 THEN 'Reporte registrado en Colón 296, Coronel Pringles.'
  WHEN 846 THEN 'Reporte registrado en Artigas 2, Coronel Pringles.'
  WHEN 847 THEN 'Reporte registrado en España 364, Coronel Pringles.'
  WHEN 848 THEN 'Reporte registrado en General Paz 356, Coronel Pringles.'
  WHEN 849 THEN 'Reporte registrado en Artigas 668, Coronel Pringles.'
  WHEN 850 THEN 'Reporte registrado en España 1017, Coronel Pringles.'
  WHEN 851 THEN 'Reporte registrado en Sarmiento 258, Coronel Pringles.'
  WHEN 852 THEN 'Reporte registrado en Mitre 879, Coronel Pringles.'
  WHEN 853 THEN 'Reporte registrado en Colón 1196, Coronel Pringles.'
  WHEN 854 THEN 'Reporte registrado en Avellaneda 726, Coronel Pringles.'
  WHEN 855 THEN 'Reporte registrado en Chiclana 138, Coronel Pringles.'
  WHEN 856 THEN 'Reporte registrado en Bahía Blanca 40, Coronel Pringles.'
  WHEN 857 THEN 'Reporte registrado en Islas Malvinas 424, Coronel Pringles.'
  WHEN 858 THEN 'Reporte registrado en Rivadavia 254, Coronel Pringles.'
  WHEN 859 THEN 'Reporte registrado en Belgrano 123, Coronel Pringles.'
  WHEN 860 THEN 'Reporte registrado en Maipú 306, Coronel Pringles.'
  WHEN 861 THEN 'Reporte registrado en Tucumán 164, Coronel Pringles.'
  WHEN 862 THEN 'Reporte registrado en Hipólito Yrigoyen 262, Coronel Pringles.'
  WHEN 863 THEN 'Reporte registrado en Suárez 843, Coronel Pringles.'
  WHEN 864 THEN 'Reporte registrado en Alsina 1108, Coronel Pringles.'
  WHEN 865 THEN 'Reporte registrado en Rodríguez Peña 337, Coronel Pringles.'
  WHEN 866 THEN 'Reporte registrado en Rodríguez Peña 1045, Coronel Pringles.'
  WHEN 867 THEN 'Reporte registrado en Moreno 44, Coronel Pringles.'
  WHEN 868 THEN 'Reporte registrado en Uruguay 569, Coronel Pringles.'
  WHEN 869 THEN 'Reporte registrado en Rodríguez Peña 50, Coronel Pringles.'
  WHEN 870 THEN 'Reporte registrado en Belgrano 232, Coronel Pringles.'
  WHEN 871 THEN 'Reporte registrado en Sarmiento 80, Coronel Pringles.'
  WHEN 872 THEN 'Reporte registrado en Colón 118, Coronel Pringles.'
  WHEN 873 THEN 'Reporte registrado en Artigas 731, Coronel Pringles.'
  WHEN 874 THEN 'Reporte registrado en Sarmiento 1043, Coronel Pringles.'
  WHEN 875 THEN 'Reporte registrado en Francia 887, Coronel Pringles.'
  WHEN 876 THEN 'Reporte registrado en Necochea 233, Coronel Pringles.'
  WHEN 877 THEN 'Reporte registrado en José Ingenieros 76, Coronel Pringles.'
  WHEN 878 THEN 'Reporte registrado en Sáenz Peña 20, Coronel Pringles.'
  WHEN 879 THEN 'Reporte registrado en Uruguay 548, Coronel Pringles.'
  WHEN 880 THEN 'Reporte registrado en Sarmiento 1554, Coronel Pringles.'
  WHEN 881 THEN 'Reporte registrado en Chacabuco 269, Coronel Pringles.'
  WHEN 882 THEN 'Reporte registrado en José Ingenieros 1065, Coronel Pringles.'
  WHEN 883 THEN 'Reporte registrado en Dorrego 266, Coronel Pringles.'
  WHEN 884 THEN 'Reporte registrado en Urquiza 275, Coronel Pringles.'
  WHEN 885 THEN 'Reporte registrado en Alvear 77, Coronel Pringles.'
  WHEN 886 THEN 'Reporte registrado en Juan XXIII 594, Coronel Pringles.'
  WHEN 887 THEN 'Reporte registrado en España 1081, Coronel Pringles.'
  WHEN 888 THEN 'Reporte registrado en Rivadavia 843, Coronel Pringles.'
  WHEN 889 THEN 'Reporte registrado en Artigas 664, Coronel Pringles.'
  WHEN 890 THEN 'Reporte registrado en 9 de Julio 149, Coronel Pringles.'
  WHEN 891 THEN 'Reporte registrado en Alvear 859, Coronel Pringles.'
  WHEN 892 THEN 'Reporte registrado en Brown 225, Coronel Pringles.'
  WHEN 893 THEN 'Reporte registrado en Urquiza 992, Coronel Pringles.'
  WHEN 894 THEN 'Reporte registrado en 24 de Septiembre 278, Coronel Pringles.'
  WHEN 895 THEN 'Reporte registrado en Pellegrini 496, Coronel Pringles.'
  WHEN 896 THEN 'Reporte registrado en España 609, Coronel Pringles.'
  WHEN 897 THEN 'Reporte registrado en Moreno 18, Coronel Pringles.'
  WHEN 898 THEN 'Reporte registrado en Bahía Blanca 506, Coronel Pringles.'
  WHEN 899 THEN 'Reporte registrado en Necochea 701, Coronel Pringles.'
  WHEN 900 THEN 'Reporte registrado en Necochea 354, Coronel Pringles.'
  WHEN 901 THEN 'Reporte registrado en Dorrego 692, Coronel Pringles.'
  WHEN 902 THEN 'Reporte registrado en Islas Malvinas 597, Coronel Pringles.'
  WHEN 903 THEN 'Reporte registrado en 9 de Julio 1624, Coronel Pringles.'
  WHEN 904 THEN 'Reporte registrado en Necochea 313, Coronel Pringles.'
  WHEN 905 THEN 'Reporte registrado en Chiclana 1591, Coronel Pringles.'
  WHEN 906 THEN 'Reporte registrado en Rivadavia 899, Coronel Pringles.'
  WHEN 907 THEN 'Reporte registrado en Maipú 1108, Coronel Pringles.'
  WHEN 908 THEN 'Reporte registrado en Rodríguez Peña 259, Coronel Pringles.'
  WHEN 909 THEN 'Reporte registrado en Uruguay 606, Coronel Pringles.'
  WHEN 910 THEN 'Reporte registrado en Artigas 1383, Coronel Pringles.'
  WHEN 911 THEN 'Reporte registrado en Urquiza 123, Coronel Pringles.'
  WHEN 912 THEN 'Reporte registrado en Mitre 35, Coronel Pringles.'
  WHEN 913 THEN 'Reporte registrado en Rivadavia 66, Coronel Pringles.'
  WHEN 914 THEN 'Reporte registrado en Garay 1046, Coronel Pringles.'
  WHEN 915 THEN 'Reporte registrado en Bahía Blanca 532, Coronel Pringles.'
  WHEN 916 THEN 'Reporte registrado en General Paz 101, Coronel Pringles.'
  WHEN 917 THEN 'Reporte registrado en 9 de Julio 591, Coronel Pringles.'
  WHEN 918 THEN 'Reporte registrado en Roca 1726, Coronel Pringles.'
  WHEN 919 THEN 'Reporte registrado en Alsina 28, Coronel Pringles.'
  WHEN 920 THEN 'Reporte registrado en Brown 20, Coronel Pringles.'
  WHEN 921 THEN 'Reporte registrado en Rodríguez Peña 352, Coronel Pringles.'
  WHEN 922 THEN 'Reporte registrado en Suárez 258, Coronel Pringles.'
  WHEN 923 THEN 'Reporte registrado en Belgrano 1640, Coronel Pringles.'
  WHEN 924 THEN 'Reporte registrado en Sáenz Peña 493, Coronel Pringles.'
  WHEN 925 THEN 'Reporte registrado en San Martín 217, Coronel Pringles.'
  WHEN 926 THEN 'Reporte registrado en Bahía Blanca 348, Coronel Pringles.'
  WHEN 927 THEN 'Reporte registrado en España 137, Coronel Pringles.'
  WHEN 928 THEN 'Reporte registrado en Dorrego 96, Coronel Pringles.'
  WHEN 929 THEN 'Reporte registrado en Italia 130, Coronel Pringles.'
  WHEN 930 THEN 'Reporte registrado en Alsina 1021, Coronel Pringles.'
  WHEN 931 THEN 'Reporte registrado en Sáenz Peña 1234, Coronel Pringles.'
  WHEN 932 THEN 'Reporte registrado en 15 de Julio 1566, Coronel Pringles.'
  WHEN 933 THEN 'Reporte registrado en Necochea 219, Coronel Pringles.'
  WHEN 934 THEN 'Reporte registrado en España 424, Coronel Pringles.'
  WHEN 935 THEN 'Reporte registrado en San Martín 1600, Coronel Pringles.'
  WHEN 936 THEN 'Reporte registrado en Rodríguez Peña 338, Coronel Pringles.'
  WHEN 937 THEN 'Reporte registrado en Uruguay 1031, Coronel Pringles.'
  WHEN 938 THEN 'Reporte registrado en Urquiza 82, Coronel Pringles.'
  WHEN 939 THEN 'Reporte registrado en Chacabuco 99, Coronel Pringles.'
  WHEN 940 THEN 'Reporte registrado en Sarmiento 1226, Coronel Pringles.'
  WHEN 941 THEN 'Reporte registrado en Sarmiento 54, Coronel Pringles.'
  WHEN 942 THEN 'Reporte registrado en Alvear 1198, Coronel Pringles.'
  WHEN 943 THEN 'Reporte registrado en Hipólito Yrigoyen 57, Coronel Pringles.'
  WHEN 944 THEN 'Reporte registrado en Sáenz Peña 1023, Coronel Pringles.'
  WHEN 945 THEN 'Reporte registrado en Garay 414, Coronel Pringles.'
  WHEN 946 THEN 'Reporte registrado en Maipú 158, Coronel Pringles.'
  WHEN 947 THEN 'Reporte registrado en Brown 506, Coronel Pringles.'
  WHEN 948 THEN 'Reporte registrado en Alsina 176, Coronel Pringles.'
  WHEN 949 THEN 'Reporte registrado en Cabrera 549, Coronel Pringles.'
  WHEN 950 THEN 'Reporte registrado en Juan XXIII 1117, Coronel Pringles.'
  WHEN 951 THEN 'Reporte registrado en Lavalle 824, Coronel Pringles.'
  WHEN 952 THEN 'Reporte registrado en Brown 229, Coronel Pringles.'
  WHEN 953 THEN 'Reporte registrado en Lavalle 1031, Coronel Pringles.'
  WHEN 954 THEN 'Reporte registrado en 9 de Julio 479, Coronel Pringles.'
  WHEN 955 THEN 'Reporte registrado en Brown 511, Coronel Pringles.'
  WHEN 956 THEN 'Reporte registrado en Colón 294, Coronel Pringles.'
  WHEN 957 THEN 'Reporte registrado en Garay 1368, Coronel Pringles.'
  WHEN 958 THEN 'Reporte registrado en Garay 1364, Coronel Pringles.'
  WHEN 959 THEN 'Reporte registrado en Italia 1078, Coronel Pringles.'
  WHEN 960 THEN 'Reporte registrado en Juan XXIII 112, Coronel Pringles.'
  WHEN 961 THEN 'Reporte registrado en San Martín 691, Coronel Pringles.'
  WHEN 962 THEN 'Reporte registrado en Francia 73, Coronel Pringles.'
  WHEN 963 THEN 'Reporte registrado en Juan XXIII 470, Coronel Pringles.'
  WHEN 964 THEN 'Reporte registrado en Sarmiento 24, Coronel Pringles.'
  WHEN 965 THEN 'Reporte registrado en Sáenz Peña 1109, Coronel Pringles.'
  WHEN 966 THEN 'Reporte registrado en José Hernández 38, Coronel Pringles.'
  WHEN 967 THEN 'Reporte registrado en Chiclana 149, Coronel Pringles.'
  WHEN 968 THEN 'Reporte registrado en Bahía Blanca 1492, Coronel Pringles.'
  WHEN 969 THEN 'Reporte registrado en Cabrera 556, Coronel Pringles.'
  WHEN 970 THEN 'Reporte registrado en Chiclana 344, Coronel Pringles.'
  WHEN 971 THEN 'Reporte registrado en Maipú 480, Coronel Pringles.'
  WHEN 972 THEN 'Reporte registrado en Alsina 266, Coronel Pringles.'
  WHEN 973 THEN 'Reporte registrado en 15 de Julio 262, Coronel Pringles.'
  WHEN 974 THEN 'Reporte registrado en Sarmiento 755, Coronel Pringles.'
  WHEN 975 THEN 'Reporte registrado en Chiclana 1448, Coronel Pringles.'
  WHEN 976 THEN 'Reporte registrado en General Paz 236, Coronel Pringles.'
  WHEN 977 THEN 'Reporte registrado en Hipólito Yrigoyen 228, Coronel Pringles.'
  WHEN 978 THEN 'Reporte registrado en Avellaneda 191, Coronel Pringles.'
  WHEN 979 THEN 'Reporte registrado en Sarmiento 1723, Coronel Pringles.'
  WHEN 980 THEN 'Reporte registrado en Maipú 1231, Coronel Pringles.'
  WHEN 981 THEN 'Reporte registrado en 25 de Mayo 8, Coronel Pringles.'
  WHEN 982 THEN 'Reporte registrado en Juan XXIII 111, Coronel Pringles.'
  WHEN 983 THEN 'Reporte registrado en Tucumán 22, Coronel Pringles.'
  WHEN 984 THEN 'Reporte registrado en José Ingenieros 296, Coronel Pringles.'
  WHEN 985 THEN 'Reporte registrado en Juan XXIII 185, Coronel Pringles.'
  WHEN 986 THEN 'Reporte registrado en Dorrego 104, Coronel Pringles.'
  WHEN 987 THEN 'Reporte registrado en Colón 157, Coronel Pringles.'
  WHEN 988 THEN 'Reporte registrado en Francia 1435, Coronel Pringles.'
  WHEN 989 THEN 'Reporte registrado en Bahía Blanca 564, Coronel Pringles.'
  WHEN 990 THEN 'Reporte registrado en Alvear 1381, Coronel Pringles.'
  WHEN 991 THEN 'Reporte registrado en José Hernández 550, Coronel Pringles.'
  WHEN 992 THEN 'Reporte registrado en 25 de Mayo 295, Coronel Pringles.'
  WHEN 993 THEN 'Reporte registrado en Pellegrini 597, Coronel Pringles.'
  WHEN 994 THEN 'Reporte registrado en Roca 223, Coronel Pringles.'
  WHEN 995 THEN 'Reporte registrado en Tucumán 268, Coronel Pringles.'
  WHEN 996 THEN 'Reporte registrado en Pellegrini 1325, Coronel Pringles.'
  WHEN 997 THEN 'Reporte registrado en Avellaneda 1374, Coronel Pringles.'
  WHEN 998 THEN 'Reporte registrado en Hipólito Yrigoyen 1267, Coronel Pringles.'
  WHEN 999 THEN 'Reporte registrado en Rivadavia 1761, Coronel Pringles.'
  WHEN 1000 THEN 'Reporte registrado en Islas Malvinas 395, Coronel Pringles.'
  WHEN 1001 THEN 'Reporte registrado en Belgrano 200, Coronel Pringles.'
  WHEN 1002 THEN 'Reporte registrado en 25 de Mayo 1327, Coronel Pringles.'
  WHEN 1003 THEN 'Reporte registrado en Rodríguez Peña 560, Coronel Pringles.'
  WHEN 1004 THEN 'Reporte registrado en Suárez 1309, Coronel Pringles.'
  WHEN 1005 THEN 'Reporte registrado en Urquiza 17, Coronel Pringles.'
  WHEN 1006 THEN 'Reporte registrado en Hipólito Yrigoyen 240, Coronel Pringles.'
  WHEN 1007 THEN 'Reporte registrado en Sáenz Peña 253, Coronel Pringles.'
  WHEN 1008 THEN 'Reporte registrado en 25 de Mayo 931, Coronel Pringles.'
  WHEN 1009 THEN 'Reporte registrado en Moreno 204, Coronel Pringles.'
  WHEN 1010 THEN 'Reporte registrado en Alsina 659, Coronel Pringles.'
  WHEN 1011 THEN 'Reporte registrado en Pellegrini 73, Coronel Pringles.'
  WHEN 1012 THEN 'Reporte registrado en Islas Malvinas 472, Coronel Pringles.'
  WHEN 1013 THEN 'Reporte registrado en 25 de Mayo 113, Coronel Pringles.'
  WHEN 1014 THEN 'Reporte registrado en 25 de Mayo 560, Coronel Pringles.'
  WHEN 1015 THEN 'Reporte registrado en 24 de Septiembre 118, Coronel Pringles.'
  WHEN 1016 THEN 'Reporte registrado en Sáenz Peña 226, Coronel Pringles.'
  WHEN 1017 THEN 'Reporte registrado en Tucumán 629, Coronel Pringles.'
  WHEN 1018 THEN 'Reporte registrado en Mitre 404, Coronel Pringles.'
  WHEN 1019 THEN 'Reporte registrado en 15 de Julio 1048, Coronel Pringles.'
  WHEN 1020 THEN 'Reporte registrado en Rodríguez Peña 1191, Coronel Pringles.'
  WHEN 1021 THEN 'Reporte registrado en 15 de Julio 635, Coronel Pringles.'
  WHEN 1022 THEN 'Reporte registrado en Chacabuco 453, Coronel Pringles.'
  WHEN 1023 THEN 'Reporte registrado en Chiclana 289, Coronel Pringles.'
  WHEN 1024 THEN 'Reporte registrado en Maipú 1294, Coronel Pringles.'
  WHEN 1025 THEN 'Reporte registrado en Pellegrini 187, Coronel Pringles.'
  WHEN 1026 THEN 'Reporte registrado en Moreno 14, Coronel Pringles.'
  WHEN 1027 THEN 'Reporte registrado en Artigas 903, Coronel Pringles.'
  WHEN 1028 THEN 'Reporte registrado en Brown 1116, Coronel Pringles.'
  WHEN 1029 THEN 'Reporte registrado en Sarmiento 289, Coronel Pringles.'
  WHEN 1030 THEN 'Reporte registrado en Bahía Blanca 459, Coronel Pringles.'
  WHEN 1031 THEN 'Reporte registrado en España 1567, Coronel Pringles.'
  WHEN 1032 THEN 'Reporte registrado en Hipólito Yrigoyen 53, Coronel Pringles.'
  WHEN 1033 THEN 'Reporte registrado en Uruguay 129, Coronel Pringles.'
  WHEN 1034 THEN 'Reporte registrado en Francia 54, Coronel Pringles.'
  WHEN 1035 THEN 'Reporte registrado en Dorrego 1080, Coronel Pringles.'
  WHEN 1036 THEN 'Reporte registrado en Hipólito Yrigoyen 357, Coronel Pringles.'
  WHEN 1037 THEN 'Reporte registrado en Garay 917, Coronel Pringles.'
  WHEN 1038 THEN 'Reporte registrado en Colón 86, Coronel Pringles.'
  WHEN 1039 THEN 'Reporte registrado en Moreno 100, Coronel Pringles.'
  WHEN 1040 THEN 'Reporte registrado en Brown 879, Coronel Pringles.'
  WHEN 1041 THEN 'Reporte registrado en Dorrego 404, Coronel Pringles.'
  WHEN 1042 THEN 'Reporte registrado en Dorrego 990, Coronel Pringles.'
  WHEN 1043 THEN 'Reporte registrado en Rivadavia 512, Coronel Pringles.'
  WHEN 1044 THEN 'Reporte registrado en José Ingenieros 723, Coronel Pringles.'
  WHEN 1045 THEN 'Reporte registrado en Colón 193, Coronel Pringles.'
  WHEN 1046 THEN 'Reporte registrado en Mitre 181, Coronel Pringles.'
  WHEN 1047 THEN 'Reporte registrado en España 373, Coronel Pringles.'
  WHEN 1048 THEN 'Reporte registrado en Chacabuco 998, Coronel Pringles.'
  WHEN 1049 THEN 'Reporte registrado en 15 de Julio 120, Coronel Pringles.'
  WHEN 1050 THEN 'Reporte registrado en Francia 205, Coronel Pringles.'
  WHEN 1051 THEN 'Reporte registrado en Sarmiento 396, Coronel Pringles.'
  WHEN 1052 THEN 'Reporte registrado en 24 de Septiembre 484, Coronel Pringles.'
  WHEN 1053 THEN 'Reporte registrado en Avellaneda 301, Coronel Pringles.'
  WHEN 1054 THEN 'Reporte registrado en Roca 1113, Coronel Pringles.'
  WHEN 1055 THEN 'Reporte registrado en Sáenz Peña 400, Coronel Pringles.'
  WHEN 1056 THEN 'Reporte registrado en Sarmiento 1129, Coronel Pringles.'
  WHEN 1057 THEN 'Reporte registrado en Lavalle 332, Coronel Pringles.'
  WHEN 1058 THEN 'Reporte registrado en 25 de Mayo 217, Coronel Pringles.'
  WHEN 1059 THEN 'Reporte registrado en 24 de Septiembre 251, Coronel Pringles.'
  WHEN 1060 THEN 'Reporte registrado en Dorrego 178, Coronel Pringles.'
  WHEN 1061 THEN 'Reporte registrado en 24 de Septiembre 392, Coronel Pringles.'
  WHEN 1062 THEN 'Reporte registrado en Islas Malvinas 235, Coronel Pringles.'
  WHEN 1063 THEN 'Reporte registrado en Necochea 289, Coronel Pringles.'
  WHEN 1064 THEN 'Reporte registrado en Chacabuco 199, Coronel Pringles.'
  WHEN 1065 THEN 'Reporte registrado en Alvear 224, Coronel Pringles.'
  WHEN 1066 THEN 'Reporte registrado en Dorrego 871, Coronel Pringles.'
  WHEN 1067 THEN 'Reporte registrado en Rivadavia 904, Coronel Pringles.'
  WHEN 1068 THEN 'Reporte registrado en San Martín 1663, Coronel Pringles.'
  WHEN 1069 THEN 'Reporte registrado en Roca 1092, Coronel Pringles.'
  WHEN 1070 THEN 'Reporte registrado en Sarmiento 1132, Coronel Pringles.'
  WHEN 1071 THEN 'Reporte registrado en Alvear 81, Coronel Pringles.'
  WHEN 1072 THEN 'Reporte registrado en 15 de Julio 602, Coronel Pringles.'
  WHEN 1073 THEN 'Reporte registrado en Alsina 422, Coronel Pringles.'
  WHEN 1074 THEN 'Reporte registrado en Belgrano 440, Coronel Pringles.'
  WHEN 1075 THEN 'Reporte registrado en Colón 37, Coronel Pringles.'
  WHEN 1076 THEN 'Reporte registrado en Roca 66, Coronel Pringles.'
  WHEN 1077 THEN 'Reporte registrado en General Paz 1266, Coronel Pringles.'
  WHEN 1078 THEN 'Reporte registrado en José Hernández 90, Coronel Pringles.'
  WHEN 1079 THEN 'Reporte registrado en Suárez 225, Coronel Pringles.'
  WHEN 1080 THEN 'Reporte registrado en General Paz 121, Coronel Pringles.'
  WHEN 1081 THEN 'Reporte registrado en Necochea 62, Coronel Pringles.'
  WHEN 1082 THEN 'Reporte registrado en Rivadavia 1013, Coronel Pringles.'
  WHEN 1083 THEN 'Reporte registrado en Avellaneda 627, Coronel Pringles.'
  WHEN 1084 THEN 'Reporte registrado en 25 de Mayo 975, Coronel Pringles.'
  WHEN 1085 THEN 'Reporte registrado en Chiclana 207, Coronel Pringles.'
  WHEN 1086 THEN 'Reporte registrado en España 494, Coronel Pringles.'
  WHEN 1087 THEN 'Reporte registrado en Belgrano 332, Coronel Pringles.'
  WHEN 1088 THEN 'Reporte registrado en Suárez 175, Coronel Pringles.'
  WHEN 1089 THEN 'Reporte registrado en Sarmiento 687, Coronel Pringles.'
  WHEN 1090 THEN 'Reporte registrado en Alvear 206, Coronel Pringles.'
  WHEN 1091 THEN 'Reporte registrado en General Paz 622, Coronel Pringles.'
  WHEN 1092 THEN 'Reporte registrado en Colón 20, Coronel Pringles.'
  WHEN 1093 THEN 'Reporte registrado en Lavalle 831, Coronel Pringles.'
  WHEN 1094 THEN 'Reporte registrado en Rivadavia 30, Coronel Pringles.'
  WHEN 1095 THEN 'Reporte registrado en Necochea 10, Coronel Pringles.'
  WHEN 1096 THEN 'Reporte registrado en Belgrano 555, Coronel Pringles.'
  WHEN 1097 THEN 'Reporte registrado en Garay 225, Coronel Pringles.'
  WHEN 1098 THEN 'Reporte registrado en Francia 568, Coronel Pringles.'
  WHEN 1099 THEN 'Reporte registrado en Uruguay 575, Coronel Pringles.'
  WHEN 1100 THEN 'Reporte registrado en Chacabuco 548, Coronel Pringles.'
  WHEN 1101 THEN 'Reporte registrado en Sarmiento 1145, Coronel Pringles.'
  WHEN 1102 THEN 'Reporte registrado en Dorrego 730, Coronel Pringles.'
  WHEN 1103 THEN 'Reporte registrado en Alvear 1234, Coronel Pringles.'
  WHEN 1104 THEN 'Reporte registrado en Chiclana 320, Coronel Pringles.'
  WHEN 1105 THEN 'Reporte registrado en Rivadavia 80, Coronel Pringles.'
  WHEN 1106 THEN 'Reporte registrado en Juan XXIII 779, Coronel Pringles.'
  WHEN 1107 THEN 'Reporte registrado en Juan XXIII 440, Coronel Pringles.'
  WHEN 1108 THEN 'Reporte registrado en Avellaneda 490, Coronel Pringles.'
  WHEN 1109 THEN 'Reporte registrado en Francia 363, Coronel Pringles.'
  WHEN 1110 THEN 'Reporte registrado en Bahía Blanca 321, Coronel Pringles.'
  WHEN 1111 THEN 'Reporte registrado en 15 de Julio 521, Coronel Pringles.'
  WHEN 1112 THEN 'Reporte registrado en Cabrera 804, Coronel Pringles.'
  WHEN 1113 THEN 'Reporte registrado en Avellaneda 414, Coronel Pringles.'
  WHEN 1114 THEN 'Reporte registrado en Sarmiento 260, Coronel Pringles.'
  WHEN 1115 THEN 'Reporte registrado en Belgrano 64, Coronel Pringles.'
  WHEN 1116 THEN 'Reporte registrado en Tucumán 347, Coronel Pringles.'
  WHEN 1117 THEN 'Reporte registrado en Rivadavia 165, Coronel Pringles.'
  WHEN 1118 THEN 'Reporte registrado en Italia 302, Coronel Pringles.'
  WHEN 1119 THEN 'Reporte registrado en Chiclana 1409, Coronel Pringles.'
  WHEN 1120 THEN 'Reporte registrado en Suárez 1131, Coronel Pringles.'
  WHEN 1121 THEN 'Reporte registrado en Alsina 200, Coronel Pringles.'
  WHEN 1122 THEN 'Reporte registrado en Rodríguez Peña 761, Coronel Pringles.'
  WHEN 1123 THEN 'Reporte registrado en Chiclana 1333, Coronel Pringles.'
  WHEN 1124 THEN 'Reporte registrado en Pellegrini 616, Coronel Pringles.'
  WHEN 1125 THEN 'Reporte registrado en Bahía Blanca 1740, Coronel Pringles.'
  WHEN 1126 THEN 'Reporte registrado en Belgrano 891, Coronel Pringles.'
  WHEN 1127 THEN 'Reporte registrado en Garay 351, Coronel Pringles.'
  WHEN 1128 THEN 'Reporte registrado en Tucumán 686, Coronel Pringles.'
  WHEN 1129 THEN 'Reporte registrado en Lavalle 1319, Coronel Pringles.'
  WHEN 1130 THEN 'Reporte registrado en José Hernández 164, Coronel Pringles.'
  WHEN 1131 THEN 'Reporte registrado en Hipólito Yrigoyen 589, Coronel Pringles.'
  WHEN 1132 THEN 'Reporte registrado en 15 de Julio 958, Coronel Pringles.'
  WHEN 1133 THEN 'Reporte registrado en Uruguay 1112, Coronel Pringles.'
  WHEN 1134 THEN 'Reporte registrado en Sáenz Peña 1362, Coronel Pringles.'
  WHEN 1135 THEN 'Reporte registrado en General Paz 113, Coronel Pringles.'
  WHEN 1136 THEN 'Reporte registrado en Lavalle 315, Coronel Pringles.'
  WHEN 1137 THEN 'Reporte registrado en Uruguay 226, Coronel Pringles.'
  WHEN 1138 THEN 'Reporte registrado en Sarmiento 171, Coronel Pringles.'
  WHEN 1139 THEN 'Reporte registrado en Pellegrini 1101, Coronel Pringles.'
  WHEN 1140 THEN 'Reporte registrado en Mitre 588, Coronel Pringles.'
  WHEN 1141 THEN 'Reporte registrado en Avellaneda 10, Coronel Pringles.'
  WHEN 1142 THEN 'Reporte registrado en Maipú 346, Coronel Pringles.'
  WHEN 1143 THEN 'Reporte registrado en Colón 1113, Coronel Pringles.'
  WHEN 1144 THEN 'Reporte registrado en Chacabuco 361, Coronel Pringles.'
  WHEN 1145 THEN 'Reporte registrado en Italia 609, Coronel Pringles.'
  WHEN 1146 THEN 'Reporte registrado en Roca 729, Coronel Pringles.'
  WHEN 1147 THEN 'Reporte registrado en José Ingenieros 342, Coronel Pringles.'
  WHEN 1148 THEN 'Reporte registrado en Mitre 1331, Coronel Pringles.'
  WHEN 1149 THEN 'Reporte registrado en Cabrera 267, Coronel Pringles.'
  WHEN 1150 THEN 'Reporte registrado en Sarmiento 1787, Coronel Pringles.'
  WHEN 1151 THEN 'Reporte registrado en Colón 353, Coronel Pringles.'
  WHEN 1152 THEN 'Reporte registrado en 24 de Septiembre 3, Coronel Pringles.'
  WHEN 1153 THEN 'Reporte registrado en José Ingenieros 28, Coronel Pringles.'
  WHEN 1154 THEN 'Reporte registrado en 24 de Septiembre 122, Coronel Pringles.'
  WHEN 1155 THEN 'Reporte registrado en Chacabuco 203, Coronel Pringles.'
  WHEN 1156 THEN 'Reporte registrado en Francia 865, Coronel Pringles.'
  WHEN 1157 THEN 'Reporte registrado en Francia 595, Coronel Pringles.'
  WHEN 1158 THEN 'Reporte registrado en Brown 857, Coronel Pringles.'
  WHEN 1159 THEN 'Reporte registrado en Sarmiento 102, Coronel Pringles.'
  WHEN 1160 THEN 'Reporte registrado en 25 de Mayo 237, Coronel Pringles.'
  WHEN 1161 THEN 'Reporte registrado en Rivadavia 812, Coronel Pringles.'
  WHEN 1162 THEN 'Reporte registrado en Chiclana 624, Coronel Pringles.'
  WHEN 1163 THEN 'Reporte registrado en Rodríguez Peña 142, Coronel Pringles.'
  WHEN 1164 THEN 'Reporte registrado en Garay 1075, Coronel Pringles.'
  WHEN 1165 THEN 'Reporte registrado en Colón 1144, Coronel Pringles.'
  WHEN 1166 THEN 'Reporte registrado en Roca 495, Coronel Pringles.'
  WHEN 1167 THEN 'Reporte registrado en Urquiza 445, Coronel Pringles.'
  WHEN 1168 THEN 'Reporte registrado en José Hernández 11, Coronel Pringles.'
  WHEN 1169 THEN 'Reporte registrado en Artigas 1311, Coronel Pringles.'
  WHEN 1170 THEN 'Reporte registrado en Garay 1378, Coronel Pringles.'
  WHEN 1171 THEN 'Reporte registrado en Uruguay 296, Coronel Pringles.'
  WHEN 1172 THEN 'Reporte registrado en Italia 397, Coronel Pringles.'
  WHEN 1173 THEN 'Reporte registrado en Juan XXIII 954, Coronel Pringles.'
  WHEN 1174 THEN 'Reporte registrado en Roca 353, Coronel Pringles.'
  WHEN 1175 THEN 'Reporte registrado en Sarmiento 153, Coronel Pringles.'
  WHEN 1176 THEN 'Reporte registrado en Sáenz Peña 687, Coronel Pringles.'
  WHEN 1177 THEN 'Reporte registrado en Bahía Blanca 90, Coronel Pringles.'
  WHEN 1178 THEN 'Reporte registrado en Tucumán 17, Coronel Pringles.'
  WHEN 1179 THEN 'Reporte registrado en Belgrano 72, Coronel Pringles.'
  WHEN 1180 THEN 'Reporte registrado en Necochea 29, Coronel Pringles.'
  WHEN 1181 THEN 'Reporte registrado en General Paz 755, Coronel Pringles.'
  WHEN 1182 THEN 'Reporte registrado en Uruguay 67, Coronel Pringles.'
  WHEN 1183 THEN 'Reporte registrado en Belgrano 395, Coronel Pringles.'
  WHEN 1184 THEN 'Reporte registrado en España 227, Coronel Pringles.'
  WHEN 1185 THEN 'Reporte registrado en Garay 1293, Coronel Pringles.'
  WHEN 1186 THEN 'Reporte registrado en Francia 48, Coronel Pringles.'
  WHEN 1187 THEN 'Reporte registrado en Avellaneda 330, Coronel Pringles.'
  WHEN 1188 THEN 'Reporte registrado en España 1014, Coronel Pringles.'
  WHEN 1189 THEN 'Reporte registrado en Moreno 229, Coronel Pringles.'
  WHEN 1190 THEN 'Reporte registrado en Colón 1192, Coronel Pringles.'
  WHEN 1191 THEN 'Reporte registrado en General Paz 1695, Coronel Pringles.'
  WHEN 1192 THEN 'Reporte registrado en Roca 375, Coronel Pringles.'
  WHEN 1193 THEN 'Reporte registrado en 15 de Julio 583, Coronel Pringles.'
  WHEN 1194 THEN 'Reporte registrado en Chacabuco 644, Coronel Pringles.'
  WHEN 1195 THEN 'Reporte registrado en Moreno 529, Coronel Pringles.'
  WHEN 1196 THEN 'Reporte registrado en Garay 1318, Coronel Pringles.'
  WHEN 1197 THEN 'Reporte registrado en Lavalle 225, Coronel Pringles.'
  WHEN 1198 THEN 'Reporte registrado en 25 de Mayo 1567, Coronel Pringles.'
  WHEN 1199 THEN 'Reporte registrado en Necochea 534, Coronel Pringles.'
  WHEN 1200 THEN 'Reporte registrado en 24 de Septiembre 1123, Coronel Pringles.'
  WHEN 1201 THEN 'Reporte registrado en Rivadavia 503, Coronel Pringles.'
  WHEN 1202 THEN 'Reporte registrado en Moreno 438, Coronel Pringles.'
  WHEN 1203 THEN 'Reporte registrado en San Martín 340, Coronel Pringles.'
  WHEN 1204 THEN 'Reporte registrado en Maipú 1156, Coronel Pringles.'
  WHEN 1205 THEN 'Reporte registrado en Maipú 61, Coronel Pringles.'
  WHEN 1206 THEN 'Reporte registrado en General Paz 185, Coronel Pringles.'
  WHEN 1207 THEN 'Reporte registrado en Maipú 1517, Coronel Pringles.'
  WHEN 1208 THEN 'Reporte registrado en José Ingenieros 186, Coronel Pringles.'
  WHEN 1209 THEN 'Reporte registrado en Francia 279, Coronel Pringles.'
  WHEN 1210 THEN 'Reporte registrado en Alvear 969, Coronel Pringles.'
  WHEN 1211 THEN 'Reporte registrado en Tucumán 854, Coronel Pringles.'
  WHEN 1212 THEN 'Reporte registrado en Urquiza 455, Coronel Pringles.'
  WHEN 1213 THEN 'Reporte registrado en Maipú 218, Coronel Pringles.'
  WHEN 1214 THEN 'Reporte registrado en 9 de Julio 780, Coronel Pringles.'
  WHEN 1215 THEN 'Reporte registrado en Avellaneda 1249, Coronel Pringles.'
  WHEN 1216 THEN 'Reporte registrado en 24 de Septiembre 1198, Coronel Pringles.'
  WHEN 1217 THEN 'Reporte registrado en Cabrera 71, Coronel Pringles.'
  WHEN 1218 THEN 'Reporte registrado en Dorrego 542, Coronel Pringles.'
  WHEN 1219 THEN 'Reporte registrado en Colón 359, Coronel Pringles.'
  WHEN 1220 THEN 'Reporte registrado en Dorrego 558, Coronel Pringles.'
  WHEN 1221 THEN 'Reporte registrado en Sarmiento 248, Coronel Pringles.'
  WHEN 1222 THEN 'Reporte registrado en Mitre 574, Coronel Pringles.'
  WHEN 1223 THEN 'Reporte registrado en Chiclana 525, Coronel Pringles.'
  WHEN 1224 THEN 'Reporte registrado en Chiclana 1139, Coronel Pringles.'
  WHEN 1225 THEN 'Reporte registrado en General Paz 1222, Coronel Pringles.'
  WHEN 1226 THEN 'Reporte registrado en Alsina 1134, Coronel Pringles.'
  WHEN 1227 THEN 'Reporte registrado en Brown 503, Coronel Pringles.'
  WHEN 1228 THEN 'Reporte registrado en 25 de Mayo 236, Coronel Pringles.'
  WHEN 1229 THEN 'Reporte registrado en 15 de Julio 1255, Coronel Pringles.'
  WHEN 1230 THEN 'Reporte registrado en General Paz 100, Coronel Pringles.'
  WHEN 1231 THEN 'Reporte registrado en Pellegrini 495, Coronel Pringles.'
  WHEN 1232 THEN 'Reporte registrado en José Ingenieros 905, Coronel Pringles.'
  WHEN 1233 THEN 'Reporte registrado en Bahía Blanca 159, Coronel Pringles.'
  WHEN 1234 THEN 'Reporte registrado en Italia 1387, Coronel Pringles.'
  WHEN 1235 THEN 'Reporte registrado en Suárez 1080, Coronel Pringles.'
  WHEN 1236 THEN 'Reporte registrado en Artigas 1235, Coronel Pringles.'
  WHEN 1237 THEN 'Reporte registrado en España 376, Coronel Pringles.'
  WHEN 1238 THEN 'Reporte registrado en Alsina 194, Coronel Pringles.'
  WHEN 1239 THEN 'Reporte registrado en 24 de Septiembre 964, Coronel Pringles.'
  WHEN 1240 THEN 'Reporte registrado en Urquiza 15, Coronel Pringles.'
  WHEN 1241 THEN 'Reporte registrado en Cabrera 273, Coronel Pringles.'
  WHEN 1242 THEN 'Reporte registrado en Garay 1085, Coronel Pringles.'
  WHEN 1243 THEN 'Reporte registrado en Italia 134, Coronel Pringles.'
  WHEN 1244 THEN 'Reporte registrado en Suárez 263, Coronel Pringles.'
  WHEN 1245 THEN 'Reporte registrado en José Hernández 137, Coronel Pringles.'
  WHEN 1246 THEN 'Reporte registrado en Moreno 682, Coronel Pringles.'
  WHEN 1247 THEN 'Reporte registrado en Alvear 209, Coronel Pringles.'
  WHEN 1248 THEN 'Reporte registrado en Roca 587, Coronel Pringles.'
  WHEN 1249 THEN 'Reporte registrado en Bahía Blanca 772, Coronel Pringles.'
  WHEN 1250 THEN 'Reporte registrado en Alsina 360, Coronel Pringles.'
  WHEN 1251 THEN 'Reporte registrado en San Martín 285, Coronel Pringles.'
  WHEN 1252 THEN 'Reporte registrado en Sarmiento 1568, Coronel Pringles.'
  WHEN 1253 THEN 'Reporte registrado en Brown 837, Coronel Pringles.'
  WHEN 1254 THEN 'Reporte registrado en Sáenz Peña 1034, Coronel Pringles.'
  WHEN 1255 THEN 'Reporte registrado en Colón 1117, Coronel Pringles.'
  WHEN 1256 THEN 'Reporte registrado en San Martín 907, Coronel Pringles.'
  WHEN 1257 THEN 'Reporte registrado en 24 de Septiembre 1078, Coronel Pringles.'
  WHEN 1258 THEN 'Reporte registrado en Bahía Blanca 226, Coronel Pringles.'
  WHEN 1259 THEN 'Reporte registrado en España 566, Coronel Pringles.'
  WHEN 1260 THEN 'Reporte registrado en San Martín 551, Coronel Pringles.'
  WHEN 1261 THEN 'Reporte registrado en Rodríguez Peña 312, Coronel Pringles.'
  WHEN 1262 THEN 'Reporte registrado en España 282, Coronel Pringles.'
  WHEN 1263 THEN 'Reporte registrado en Chacabuco 306, Coronel Pringles.'
  WHEN 1264 THEN 'Reporte registrado en José Ingenieros 158, Coronel Pringles.'
  WHEN 1265 THEN 'Reporte registrado en Garay 173, Coronel Pringles.'
  WHEN 1266 THEN 'Reporte registrado en General Paz 232, Coronel Pringles.'
  WHEN 1267 THEN 'Reporte registrado en Lavalle 561, Coronel Pringles.'
  WHEN 1268 THEN 'Reporte registrado en Alvear 429, Coronel Pringles.'
  WHEN 1269 THEN 'Reporte registrado en Chacabuco 446, Coronel Pringles.'
  WHEN 1270 THEN 'Reporte registrado en Avellaneda 539, Coronel Pringles.'
  WHEN 1271 THEN 'Reporte registrado en Islas Malvinas 1006, Coronel Pringles.'
  WHEN 1272 THEN 'Reporte registrado en Sáenz Peña 436, Coronel Pringles.'
  WHEN 1273 THEN 'Reporte registrado en Suárez 373, Coronel Pringles.'
  WHEN 1274 THEN 'Reporte registrado en San Martín 94, Coronel Pringles.'
  WHEN 1275 THEN 'Reporte registrado en 24 de Septiembre 207, Coronel Pringles.'
  WHEN 1276 THEN 'Reporte registrado en Moreno 867, Coronel Pringles.'
  WHEN 1277 THEN 'Reporte registrado en Artigas 1359, Coronel Pringles.'
  WHEN 1278 THEN 'Reporte registrado en Brown 634, Coronel Pringles.'
  WHEN 1279 THEN 'Reporte registrado en Chiclana 519, Coronel Pringles.'
  WHEN 1280 THEN 'Reporte registrado en Artigas 446, Coronel Pringles.'
  WHEN 1281 THEN 'Reporte registrado en 15 de Julio 642, Coronel Pringles.'
  WHEN 1282 THEN 'Reporte registrado en Italia 1187, Coronel Pringles.'
  WHEN 1283 THEN 'Reporte registrado en 25 de Mayo 78, Coronel Pringles.'
  WHEN 1284 THEN 'Reporte registrado en Colón 510, Coronel Pringles.'
  WHEN 1285 THEN 'Reporte registrado en Uruguay 1163, Coronel Pringles.'
  WHEN 1286 THEN 'Reporte registrado en Urquiza 332, Coronel Pringles.'
  WHEN 1287 THEN 'Reporte registrado en Alvear 895, Coronel Pringles.'
  WHEN 1288 THEN 'Reporte registrado en Italia 773, Coronel Pringles.'
  WHEN 1289 THEN 'Reporte registrado en Brown 233, Coronel Pringles.'
  WHEN 1290 THEN 'Reporte registrado en Colón 1010, Coronel Pringles.'
  WHEN 1291 THEN 'Reporte registrado en 24 de Septiembre 1074, Coronel Pringles.'
  WHEN 1292 THEN 'Reporte registrado en Belgrano 1403, Coronel Pringles.'
  WHEN 1293 THEN 'Reporte registrado en Juan XXIII 60, Coronel Pringles.'
  WHEN 1294 THEN 'Reporte registrado en Uruguay 1075, Coronel Pringles.'
  WHEN 1295 THEN 'Reporte registrado en Italia 708, Coronel Pringles.'
  WHEN 1296 THEN 'Reporte registrado en Uruguay 1098, Coronel Pringles.'
  WHEN 1297 THEN 'Reporte registrado en 25 de Mayo 109, Coronel Pringles.'
  WHEN 1298 THEN 'Reporte registrado en Islas Malvinas 270, Coronel Pringles.'
  WHEN 1299 THEN 'Reporte registrado en Alsina 982, Coronel Pringles.'
  WHEN 1300 THEN 'Reporte registrado en Bahía Blanca 1022, Coronel Pringles.'
  WHEN 1301 THEN 'Reporte registrado en Lavalle 1288, Coronel Pringles.'
  WHEN 1302 THEN 'Reporte registrado en Garay 1078, Coronel Pringles.'
  WHEN 1303 THEN 'Reporte registrado en Maipú 182, Coronel Pringles.'
  WHEN 1304 THEN 'Reporte registrado en Roca 189, Coronel Pringles.'
  WHEN 1305 THEN 'Reporte registrado en Hipólito Yrigoyen 486, Coronel Pringles.'
  WHEN 1306 THEN 'Reporte registrado en 15 de Julio 880, Coronel Pringles.'
  WHEN 1307 THEN 'Reporte registrado en Colón 113, Coronel Pringles.'
  WHEN 1308 THEN 'Reporte registrado en Alsina 359, Coronel Pringles.'
  WHEN 1309 THEN 'Reporte registrado en Italia 141, Coronel Pringles.'
  WHEN 1310 THEN 'Reporte registrado en Sarmiento 1134, Coronel Pringles.'
  WHEN 1311 THEN 'Reporte registrado en Cabrera 292, Coronel Pringles.'
  WHEN 1312 THEN 'Reporte registrado en Avellaneda 1215, Coronel Pringles.'
  WHEN 1313 THEN 'Reporte registrado en Pellegrini 171, Coronel Pringles.'
  WHEN 1314 THEN 'Reporte registrado en San Martín 769, Coronel Pringles.'
  WHEN 1315 THEN 'Reporte registrado en Artigas 260, Coronel Pringles.'
  WHEN 1316 THEN 'Reporte registrado en General Paz 575, Coronel Pringles.'
  WHEN 1317 THEN 'Reporte registrado en Italia 732, Coronel Pringles.'
  WHEN 1318 THEN 'Reporte registrado en Moreno 243, Coronel Pringles.'
  WHEN 1319 THEN 'Reporte registrado en Mitre 148, Coronel Pringles.'
  WHEN 1320 THEN 'Reporte registrado en Cabrera 1013, Coronel Pringles.'
  WHEN 1321 THEN 'Reporte registrado en José Hernández 28, Coronel Pringles.'
  WHEN 1322 THEN 'Reporte registrado en Francia 1085, Coronel Pringles.'
  WHEN 1323 THEN 'Reporte registrado en Mitre 96, Coronel Pringles.'
  WHEN 1324 THEN 'Reporte registrado en Italia 655, Coronel Pringles.'
  WHEN 1325 THEN 'Reporte registrado en Juan XXIII 1055, Coronel Pringles.'
  WHEN 1326 THEN 'Reporte registrado en Avellaneda 510, Coronel Pringles.'
  WHEN 1327 THEN 'Reporte registrado en Maipú 152, Coronel Pringles.'
  WHEN 1328 THEN 'Reporte registrado en Alvear 641, Coronel Pringles.'
  WHEN 1329 THEN 'Reporte registrado en Rivadavia 73, Coronel Pringles.'
  WHEN 1330 THEN 'Reporte registrado en Dorrego 476, Coronel Pringles.'
  WHEN 1331 THEN 'Reporte registrado en Suárez 238, Coronel Pringles.'
  WHEN 1332 THEN 'Reporte registrado en Belgrano 785, Coronel Pringles.'
  WHEN 1333 THEN 'Reporte registrado en Roca 662, Coronel Pringles.'
  WHEN 1334 THEN 'Reporte registrado en Brown 1105, Coronel Pringles.'
  WHEN 1335 THEN 'Reporte registrado en Mitre 257, Coronel Pringles.'
  WHEN 1336 THEN 'Reporte registrado en Rivadavia 17, Coronel Pringles.'
  WHEN 1337 THEN 'Reporte registrado en España 1017, Coronel Pringles.'
  WHEN 1338 THEN 'Reporte registrado en 9 de Julio 238, Coronel Pringles.'
  WHEN 1339 THEN 'Reporte registrado en 15 de Julio 740, Coronel Pringles.'
  WHEN 1340 THEN 'Reporte registrado en Moreno 776, Coronel Pringles.'
  WHEN 1341 THEN 'Reporte registrado en José Hernández 142, Coronel Pringles.'
  WHEN 1342 THEN 'Reporte registrado en Alvear 1310, Coronel Pringles.'
  WHEN 1343 THEN 'Reporte registrado en José Hernández 543, Coronel Pringles.'
  WHEN 1344 THEN 'Reporte registrado en Pellegrini 523, Coronel Pringles.'
  WHEN 1345 THEN 'Reporte registrado en Colón 1122, Coronel Pringles.'
  WHEN 1346 THEN 'Reporte registrado en Tucumán 868, Coronel Pringles.'
  WHEN 1347 THEN 'Reporte registrado en Italia 188, Coronel Pringles.'
  WHEN 1348 THEN 'Reporte registrado en Mitre 357, Coronel Pringles.'
  WHEN 1349 THEN 'Reporte registrado en Rivadavia 128, Coronel Pringles.'
  WHEN 1350 THEN 'Reporte registrado en Necochea 71, Coronel Pringles.'
  WHEN 1351 THEN 'Reporte registrado en Chiclana 1205, Coronel Pringles.'
  WHEN 1352 THEN 'Reporte registrado en Cabrera 480, Coronel Pringles.'
  WHEN 1353 THEN 'Reporte registrado en Chacabuco 2, Coronel Pringles.'
  WHEN 1354 THEN 'Reporte registrado en Islas Malvinas 633, Coronel Pringles.'
  WHEN 1355 THEN 'Reporte registrado en Rodríguez Peña 926, Coronel Pringles.'
  WHEN 1356 THEN 'Reporte registrado en Uruguay 709, Coronel Pringles.'
  WHEN 1357 THEN 'Reporte registrado en Maipú 517, Coronel Pringles.'
  WHEN 1358 THEN 'Reporte registrado en Garay 95, Coronel Pringles.'
  WHEN 1359 THEN 'Reporte registrado en Brown 476, Coronel Pringles.'
  WHEN 1360 THEN 'Reporte registrado en Suárez 788, Coronel Pringles.'
  WHEN 1361 THEN 'Reporte registrado en Hipólito Yrigoyen 917, Coronel Pringles.'
  WHEN 1362 THEN 'Reporte registrado en Bahía Blanca 220, Coronel Pringles.'
  WHEN 1363 THEN 'Reporte registrado en Brown 1274, Coronel Pringles.'
  WHEN 1364 THEN 'Reporte registrado en Suárez 815, Coronel Pringles.'
  WHEN 1365 THEN 'Reporte registrado en Suárez 259, Coronel Pringles.'
  WHEN 1366 THEN 'Reporte registrado en Suárez 593, Coronel Pringles.'
  WHEN 1367 THEN 'Reporte registrado en España 1210, Coronel Pringles.'
  WHEN 1368 THEN 'Reporte registrado en Italia 732, Coronel Pringles.'
  WHEN 1369 THEN 'Reporte registrado en 24 de Septiembre 70, Coronel Pringles.'
  WHEN 1370 THEN 'Reporte registrado en Sarmiento 173, Coronel Pringles.'
  WHEN 1371 THEN 'Reporte registrado en Colón 652, Coronel Pringles.'
  WHEN 1372 THEN 'Reporte registrado en Suárez 606, Coronel Pringles.'
  WHEN 1373 THEN 'Reporte registrado en Moreno 280, Coronel Pringles.'
  WHEN 1374 THEN 'Reporte registrado en Garay 259, Coronel Pringles.'
  WHEN 1375 THEN 'Reporte registrado en Maipú 39, Coronel Pringles.'
  WHEN 1376 THEN 'Reporte registrado en Necochea 633, Coronel Pringles.'
  WHEN 1377 THEN 'Reporte registrado en Italia 363, Coronel Pringles.'
  WHEN 1378 THEN 'Reporte registrado en Italia 1016, Coronel Pringles.'
  WHEN 1379 THEN 'Reporte registrado en San Martín 960, Coronel Pringles.'
  WHEN 1380 THEN 'Reporte registrado en 25 de Mayo 87, Coronel Pringles.'
  WHEN 1381 THEN 'Reporte registrado en Avellaneda 160, Coronel Pringles.'
  WHEN 1382 THEN 'Reporte registrado en Avellaneda 61, Coronel Pringles.'
  WHEN 1383 THEN 'Reporte registrado en 9 de Julio 109, Coronel Pringles.'
  WHEN 1384 THEN 'Reporte registrado en Italia 1351, Coronel Pringles.'
  WHEN 1385 THEN 'Reporte registrado en Colón 1290, Coronel Pringles.'
  WHEN 1386 THEN 'Reporte registrado en Necochea 996, Coronel Pringles.'
  WHEN 1387 THEN 'Reporte registrado en España 165, Coronel Pringles.'
  WHEN 1388 THEN 'Reporte registrado en Necochea 1067, Coronel Pringles.'
  WHEN 1389 THEN 'Reporte registrado en San Martín 167, Coronel Pringles.'
  WHEN 1390 THEN 'Reporte registrado en Sarmiento 197, Coronel Pringles.'
  WHEN 1391 THEN 'Reporte registrado en Italia 1600, Coronel Pringles.'
  WHEN 1392 THEN 'Reporte registrado en Italia 195, Coronel Pringles.'
  WHEN 1393 THEN 'Reporte registrado en 24 de Septiembre 589, Coronel Pringles.'
  WHEN 1394 THEN 'Reporte registrado en Colón 153, Coronel Pringles.'
  WHEN 1395 THEN 'Reporte registrado en Lavalle 759, Coronel Pringles.'
  WHEN 1396 THEN 'Reporte registrado en Cabrera 264, Coronel Pringles.'
  WHEN 1397 THEN 'Reporte registrado en Maipú 359, Coronel Pringles.'
  WHEN 1398 THEN 'Reporte registrado en Brown 353, Coronel Pringles.'
  WHEN 1399 THEN 'Reporte registrado en Alsina 595, Coronel Pringles.'
  WHEN 1400 THEN 'Reporte registrado en Moreno 1230, Coronel Pringles.'
  WHEN 1401 THEN 'Reporte registrado en Necochea 407, Coronel Pringles.'
  WHEN 1402 THEN 'Reporte registrado en Colón 570, Coronel Pringles.'
  WHEN 1403 THEN 'Reporte registrado en Suárez 33, Coronel Pringles.'
  WHEN 1404 THEN 'Reporte registrado en Chiclana 1322, Coronel Pringles.'
  WHEN 1405 THEN 'Reporte registrado en 9 de Julio 1618, Coronel Pringles.'
  WHEN 1406 THEN 'Reporte registrado en Artigas 170, Coronel Pringles.'
  WHEN 1407 THEN 'Reporte registrado en Alsina 103, Coronel Pringles.'
  WHEN 1408 THEN 'Reporte registrado en Rodríguez Peña 940, Coronel Pringles.'
  WHEN 1409 THEN 'Reporte registrado en Garay 505, Coronel Pringles.'
  WHEN 1410 THEN 'Reporte registrado en Bahía Blanca 209, Coronel Pringles.'
  WHEN 1411 THEN 'Reporte registrado en José Ingenieros 10, Coronel Pringles.'
  WHEN 1412 THEN 'Reporte registrado en Artigas 947, Coronel Pringles.'
  WHEN 1413 THEN 'Reporte registrado en Juan XXIII 476, Coronel Pringles.'
  WHEN 1414 THEN 'Reporte registrado en Italia 141, Coronel Pringles.'
  WHEN 1415 THEN 'Reporte registrado en Hipólito Yrigoyen 344, Coronel Pringles.'
  WHEN 1416 THEN 'Reporte registrado en Francia 3, Coronel Pringles.'
  WHEN 1417 THEN 'Reporte registrado en 15 de Julio 34, Coronel Pringles.'
  WHEN 1418 THEN 'Reporte registrado en Mitre 387, Coronel Pringles.'
  WHEN 1419 THEN 'Reporte registrado en Maipú 207, Coronel Pringles.'
  WHEN 1420 THEN 'Reporte registrado en Rodríguez Peña 253, Coronel Pringles.'
  WHEN 1421 THEN 'Reporte registrado en Sarmiento 944, Coronel Pringles.'
  WHEN 1422 THEN 'Reporte registrado en Avellaneda 196, Coronel Pringles.'
  WHEN 1423 THEN 'Reporte registrado en General Paz 318, Coronel Pringles.'
  WHEN 1424 THEN 'Reporte registrado en Avellaneda 310, Coronel Pringles.'
  WHEN 1425 THEN 'Reporte registrado en San Martín 50, Coronel Pringles.'
  WHEN 1426 THEN 'Reporte registrado en Roca 898, Coronel Pringles.'
  WHEN 1427 THEN 'Reporte registrado en Pellegrini 611, Coronel Pringles.'
  WHEN 1428 THEN 'Reporte registrado en Cabrera 478, Coronel Pringles.'
  WHEN 1429 THEN 'Reporte registrado en Pellegrini 742, Coronel Pringles.'
  WHEN 1430 THEN 'Reporte registrado en Maipú 1419, Coronel Pringles.'
  WHEN 1431 THEN 'Reporte registrado en Dorrego 140, Coronel Pringles.'
  WHEN 1432 THEN 'Reporte registrado en Artigas 130, Coronel Pringles.'
  WHEN 1433 THEN 'Reporte registrado en Chacabuco 751, Coronel Pringles.'
  WHEN 1434 THEN 'Reporte registrado en Lavalle 1156, Coronel Pringles.'
  WHEN 1435 THEN 'Reporte registrado en Maipú 1298, Coronel Pringles.'
  WHEN 1436 THEN 'Reporte registrado en Artigas 568, Coronel Pringles.'
  WHEN 1437 THEN 'Reporte registrado en Cabrera 369, Coronel Pringles.'
  WHEN 1438 THEN 'Reporte registrado en Avellaneda 62, Coronel Pringles.'
  WHEN 1439 THEN 'Reporte registrado en Colón 169, Coronel Pringles.'
  WHEN 1440 THEN 'Reporte registrado en España 1316, Coronel Pringles.'
  WHEN 1441 THEN 'Reporte registrado en Colón 694, Coronel Pringles.'
  WHEN 1442 THEN 'Reporte registrado en Uruguay 1134, Coronel Pringles.'
  WHEN 1443 THEN 'Reporte registrado en Sarmiento 727, Coronel Pringles.'
  WHEN 1444 THEN 'Reporte registrado en Artigas 625, Coronel Pringles.'
  WHEN 1445 THEN 'Reporte registrado en Chiclana 406, Coronel Pringles.'
  WHEN 1446 THEN 'Reporte registrado en Avellaneda 495, Coronel Pringles.'
  WHEN 1447 THEN 'Reporte registrado en Mitre 1030, Coronel Pringles.'
  WHEN 1448 THEN 'Reporte registrado en Islas Malvinas 38, Coronel Pringles.'
  WHEN 1449 THEN 'Reporte registrado en Colón 135, Coronel Pringles.'
  WHEN 1450 THEN 'Reporte registrado en Chiclana 171, Coronel Pringles.'
  WHEN 1451 THEN 'Reporte registrado en Roca 1151, Coronel Pringles.'
  WHEN 1452 THEN 'Reporte registrado en José Ingenieros 809, Coronel Pringles.'
  WHEN 1453 THEN 'Reporte registrado en Uruguay 266, Coronel Pringles.'
  WHEN 1454 THEN 'Reporte registrado en Brown 793, Coronel Pringles.'
  WHEN 1455 THEN 'Reporte registrado en Urquiza 1339, Coronel Pringles.'
  WHEN 1456 THEN 'Reporte registrado en Sáenz Peña 533, Coronel Pringles.'
  WHEN 1457 THEN 'Reporte registrado en Italia 1141, Coronel Pringles.'
  WHEN 1458 THEN 'Reporte registrado en Alsina 432, Coronel Pringles.'
  WHEN 1459 THEN 'Reporte registrado en José Hernández 1142, Coronel Pringles.'
  WHEN 1460 THEN 'Reporte registrado en Chacabuco 416, Coronel Pringles.'
  WHEN 1461 THEN 'Reporte registrado en Francia 1, Coronel Pringles.'
  WHEN 1462 THEN 'Reporte registrado en Alvear 439, Coronel Pringles.'
  WHEN 1463 THEN 'Reporte registrado en Uruguay 896, Coronel Pringles.'
  WHEN 1464 THEN 'Reporte registrado en Urquiza 676, Coronel Pringles.'
  WHEN 1465 THEN 'Reporte registrado en Brown 732, Coronel Pringles.'
  WHEN 1466 THEN 'Reporte registrado en Francia 439, Coronel Pringles.'
  WHEN 1467 THEN 'Reporte registrado en Chiclana 745, Coronel Pringles.'
  WHEN 1468 THEN 'Reporte registrado en Tucumán 760, Coronel Pringles.'
  WHEN 1469 THEN 'Reporte registrado en Juan XXIII 1047, Coronel Pringles.'
  WHEN 1470 THEN 'Reporte registrado en Italia 422, Coronel Pringles.'
  WHEN 1471 THEN 'Reporte registrado en Dorrego 790, Coronel Pringles.'
  WHEN 1472 THEN 'Reporte registrado en Necochea 160, Coronel Pringles.'
  WHEN 1473 THEN 'Reporte registrado en Cabrera 293, Coronel Pringles.'
  WHEN 1474 THEN 'Reporte registrado en Islas Malvinas 999, Coronel Pringles.'
  WHEN 1475 THEN 'Reporte registrado en Bahía Blanca 1629, Coronel Pringles.'
  WHEN 1476 THEN 'Reporte registrado en 15 de Julio 1210, Coronel Pringles.'
  WHEN 1477 THEN 'Reporte registrado en Pellegrini 271, Coronel Pringles.'
  WHEN 1478 THEN 'Reporte registrado en Rivadavia 216, Coronel Pringles.'
  WHEN 1479 THEN 'Reporte registrado en Dorrego 177, Coronel Pringles.'
  WHEN 1480 THEN 'Reporte registrado en Garay 381, Coronel Pringles.'
  WHEN 1481 THEN 'Reporte registrado en Garay 903, Coronel Pringles.'
  WHEN 1482 THEN 'Reporte registrado en Sarmiento 256, Coronel Pringles.'
  WHEN 1483 THEN 'Reporte registrado en Maipú 14, Coronel Pringles.'
  WHEN 1484 THEN 'Reporte registrado en Cabrera 594, Coronel Pringles.'
  WHEN 1485 THEN 'Reporte registrado en Belgrano 447, Coronel Pringles.'
  WHEN 1486 THEN 'Reporte registrado en Artigas 281, Coronel Pringles.'
  WHEN 1487 THEN 'Reporte registrado en Sáenz Peña 108, Coronel Pringles.'
  WHEN 1488 THEN 'Reporte registrado en José Hernández 298, Coronel Pringles.'
  WHEN 1489 THEN 'Reporte registrado en Bahía Blanca 986, Coronel Pringles.'
  WHEN 1490 THEN 'Reporte registrado en Avellaneda 1274, Coronel Pringles.'
  WHEN 1491 THEN 'Reporte registrado en Pellegrini 441, Coronel Pringles.'
  WHEN 1492 THEN 'Reporte registrado en Chiclana 792, Coronel Pringles.'
  WHEN 1493 THEN 'Reporte registrado en Islas Malvinas 260, Coronel Pringles.'
  WHEN 1494 THEN 'Reporte registrado en Moreno 865, Coronel Pringles.'
  WHEN 1495 THEN 'Reporte registrado en Brown 268, Coronel Pringles.'
  WHEN 1496 THEN 'Reporte registrado en Islas Malvinas 1100, Coronel Pringles.'
  WHEN 1497 THEN 'Reporte registrado en Bahía Blanca 417, Coronel Pringles.'
  WHEN 1498 THEN 'Reporte registrado en Cabrera 696, Coronel Pringles.'
  WHEN 1499 THEN 'Reporte registrado en España 1009, Coronel Pringles.'
  WHEN 1500 THEN 'Reporte registrado en Sarmiento 555, Coronel Pringles.'
  WHEN 1501 THEN 'Reporte registrado en Dorrego 974, Coronel Pringles.'
  WHEN 1502 THEN 'Reporte registrado en Avellaneda 124, Coronel Pringles.'
  WHEN 1503 THEN 'Reporte registrado en Lavalle 98, Coronel Pringles.'
  WHEN 1504 THEN 'Reporte registrado en Alsina 285, Coronel Pringles.'
  WHEN 1505 THEN 'Reporte registrado en Necochea 443, Coronel Pringles.'
  WHEN 1506 THEN 'Reporte registrado en Uruguay 121, Coronel Pringles.'
  WHEN 1507 THEN 'Reporte registrado en Moreno 310, Coronel Pringles.'
  WHEN 1508 THEN 'Reporte registrado en Uruguay 340, Coronel Pringles.'
  WHEN 1509 THEN 'Reporte registrado en Garay 157, Coronel Pringles.'
  WHEN 1510 THEN 'Reporte registrado en San Martín 623, Coronel Pringles.'
  WHEN 1511 THEN 'Reporte registrado en Sarmiento 1250, Coronel Pringles.'
  WHEN 1512 THEN 'Reporte registrado en San Martín 1310, Coronel Pringles.'
  WHEN 1513 THEN 'Reporte registrado en Garay 53, Coronel Pringles.'
  WHEN 1514 THEN 'Reporte registrado en España 1291, Coronel Pringles.'
  WHEN 1515 THEN 'Reporte registrado en Urquiza 195, Coronel Pringles.'
  WHEN 1516 THEN 'Reporte registrado en Garay 110, Coronel Pringles.'
  WHEN 1517 THEN 'Reporte registrado en Chacabuco 694, Coronel Pringles.'
  WHEN 1518 THEN 'Reporte registrado en Lavalle 8, Coronel Pringles.'
  WHEN 1519 THEN 'Reporte registrado en Pellegrini 470, Coronel Pringles.'
  WHEN 1520 THEN 'Reporte registrado en Alvear 369, Coronel Pringles.'
  WHEN 1521 THEN 'Reporte registrado en Alvear 1354, Coronel Pringles.'
  WHEN 1522 THEN 'Reporte registrado en Pellegrini 1184, Coronel Pringles.'
  WHEN 1523 THEN 'Reporte registrado en General Paz 1133, Coronel Pringles.'
  WHEN 1524 THEN 'Reporte registrado en Colón 1604, Coronel Pringles.'
  WHEN 1525 THEN 'Reporte registrado en Hipólito Yrigoyen 293, Coronel Pringles.'
  WHEN 1526 THEN 'Reporte registrado en Uruguay 1380, Coronel Pringles.'
  WHEN 1527 THEN 'Reporte registrado en Artigas 969, Coronel Pringles.'
  WHEN 1528 THEN 'Reporte registrado en 15 de Julio 289, Coronel Pringles.'
  WHEN 1529 THEN 'Reporte registrado en Alsina 128, Coronel Pringles.'
  WHEN 1530 THEN 'Reporte registrado en Suárez 1538, Coronel Pringles.'
  WHEN 1531 THEN 'Reporte registrado en José Hernández 392, Coronel Pringles.'
  WHEN 1532 THEN 'Reporte registrado en Islas Malvinas 189, Coronel Pringles.'
  WHEN 1533 THEN 'Reporte registrado en Mitre 627, Coronel Pringles.'
  WHEN 1534 THEN 'Reporte registrado en Belgrano 551, Coronel Pringles.'
  WHEN 1535 THEN 'Reporte registrado en Mitre 822, Coronel Pringles.'
  WHEN 1536 THEN 'Reporte registrado en 15 de Julio 78, Coronel Pringles.'
  WHEN 1537 THEN 'Reporte registrado en Lavalle 201, Coronel Pringles.'
  WHEN 1538 THEN 'Reporte registrado en 24 de Septiembre 1110, Coronel Pringles.'
  WHEN 1539 THEN 'Reporte registrado en Urquiza 421, Coronel Pringles.'
  WHEN 1540 THEN 'Reporte registrado en Necochea 894, Coronel Pringles.'
  WHEN 1541 THEN 'Reporte registrado en Hipólito Yrigoyen 710, Coronel Pringles.'
  WHEN 1542 THEN 'Reporte registrado en Alsina 162, Coronel Pringles.'
  WHEN 1543 THEN 'Reporte registrado en Urquiza 1260, Coronel Pringles.'
  WHEN 1544 THEN 'Reporte registrado en Juan XXIII 359, Coronel Pringles.'
  WHEN 1545 THEN 'Reporte registrado en Avellaneda 420, Coronel Pringles.'
  WHEN 1546 THEN 'Reporte registrado en Alsina 206, Coronel Pringles.'
  WHEN 1547 THEN 'Reporte registrado en Chiclana 418, Coronel Pringles.'
  WHEN 1548 THEN 'Reporte registrado en San Martín 25, Coronel Pringles.'
  WHEN 1549 THEN 'Reporte registrado en Garay 1204, Coronel Pringles.'
  WHEN 1550 THEN 'Reporte registrado en Brown 669, Coronel Pringles.'
  WHEN 1551 THEN 'Reporte registrado en Islas Malvinas 619, Coronel Pringles.'
  WHEN 1552 THEN 'Reporte registrado en Lavalle 150, Coronel Pringles.'
  WHEN 1553 THEN 'Reporte registrado en Hipólito Yrigoyen 279, Coronel Pringles.'
  WHEN 1554 THEN 'Reporte registrado en 15 de Julio 392, Coronel Pringles.'
  WHEN 1555 THEN 'Reporte registrado en Necochea 108, Coronel Pringles.'
  WHEN 1556 THEN 'Reporte registrado en Uruguay 391, Coronel Pringles.'
  WHEN 1557 THEN 'Reporte registrado en Islas Malvinas 21, Coronel Pringles.'
  WHEN 1558 THEN 'Reporte registrado en Belgrano 46, Coronel Pringles.'
  WHEN 1559 THEN 'Reporte registrado en Dorrego 844, Coronel Pringles.'
  WHEN 1560 THEN 'Reporte registrado en General Paz 1229, Coronel Pringles.'
  WHEN 1561 THEN 'Reporte registrado en Francia 75, Coronel Pringles.'
  WHEN 1562 THEN 'Reporte registrado en Urquiza 537, Coronel Pringles.'
  WHEN 1563 THEN 'Reporte registrado en Alsina 56, Coronel Pringles.'
  WHEN 1564 THEN 'Reporte registrado en Colón 672, Coronel Pringles.'
  WHEN 1565 THEN 'Reporte registrado en Pellegrini 656, Coronel Pringles.'
  WHEN 1566 THEN 'Reporte registrado en Sarmiento 257, Coronel Pringles.'
  WHEN 1567 THEN 'Reporte registrado en Rodríguez Peña 232, Coronel Pringles.'
  WHEN 1568 THEN 'Reporte registrado en General Paz 948, Coronel Pringles.'
  WHEN 1569 THEN 'Reporte registrado en Juan XXIII 910, Coronel Pringles.'
  WHEN 1570 THEN 'Reporte registrado en General Paz 266, Coronel Pringles.'
  WHEN 1571 THEN 'Reporte registrado en Dorrego 158, Coronel Pringles.'
  WHEN 1572 THEN 'Reporte registrado en Mitre 1289, Coronel Pringles.'
  WHEN 1573 THEN 'Reporte registrado en Islas Malvinas 849, Coronel Pringles.'
  WHEN 1574 THEN 'Reporte registrado en Rodríguez Peña 1017, Coronel Pringles.'
  WHEN 1575 THEN 'Reporte registrado en Brown 711, Coronel Pringles.'
  WHEN 1576 THEN 'Reporte registrado en Alsina 478, Coronel Pringles.'
  WHEN 1577 THEN 'Reporte registrado en Chacabuco 126, Coronel Pringles.'
  WHEN 1578 THEN 'Reporte registrado en General Paz 19, Coronel Pringles.'
  WHEN 1579 THEN 'Reporte registrado en Avellaneda 135, Coronel Pringles.'
  WHEN 1580 THEN 'Reporte registrado en Chacabuco 34, Coronel Pringles.'
  WHEN 1581 THEN 'Reporte registrado en Islas Malvinas 637, Coronel Pringles.'
  WHEN 1582 THEN 'Reporte registrado en Belgrano 219, Coronel Pringles.'
  WHEN 1583 THEN 'Reporte registrado en 25 de Mayo 1762, Coronel Pringles.'
  WHEN 1584 THEN 'Reporte registrado en Rodríguez Peña 697, Coronel Pringles.'
  WHEN 1585 THEN 'Reporte registrado en Mitre 110, Coronel Pringles.'
  WHEN 1586 THEN 'Reporte registrado en 24 de Septiembre 1358, Coronel Pringles.'
  WHEN 1587 THEN 'Reporte registrado en Islas Malvinas 1179, Coronel Pringles.'
  WHEN 1588 THEN 'Reporte registrado en Necochea 40, Coronel Pringles.'
  WHEN 1589 THEN 'Reporte registrado en Suárez 354, Coronel Pringles.'
  WHEN 1590 THEN 'Reporte registrado en Francia 548, Coronel Pringles.'
  WHEN 1591 THEN 'Reporte registrado en Moreno 1374, Coronel Pringles.'
  WHEN 1592 THEN 'Reporte registrado en Mitre 401, Coronel Pringles.'
  WHEN 1593 THEN 'Reporte registrado en San Martín 32, Coronel Pringles.'
  WHEN 1594 THEN 'Reporte registrado en Rodríguez Peña 1091, Coronel Pringles.'
  WHEN 1595 THEN 'Reporte registrado en Islas Malvinas 986, Coronel Pringles.'
  WHEN 1596 THEN 'Reporte registrado en Dorrego 1073, Coronel Pringles.'
  WHEN 1597 THEN 'Reporte registrado en Necochea 680, Coronel Pringles.'
  WHEN 1598 THEN 'Reporte registrado en Suárez 213, Coronel Pringles.'
  WHEN 1599 THEN 'Reporte registrado en Sarmiento 915, Coronel Pringles.'
  WHEN 1600 THEN 'Reporte registrado en Italia 409, Coronel Pringles.'
  WHEN 1601 THEN 'Reporte registrado en Uruguay 152, Coronel Pringles.'
  WHEN 1602 THEN 'Reporte registrado en Sarmiento 146, Coronel Pringles.'
  WHEN 1603 THEN 'Reporte registrado en Chacabuco 396, Coronel Pringles.'
  WHEN 1604 THEN 'Reporte registrado en Italia 1137, Coronel Pringles.'
  WHEN 1605 THEN 'Reporte registrado en Italia 888, Coronel Pringles.'
  WHEN 1606 THEN 'Reporte registrado en Sarmiento 563, Coronel Pringles.'
  WHEN 1607 THEN 'Reporte registrado en Avellaneda 294, Coronel Pringles.'
  WHEN 1608 THEN 'Reporte registrado en Urquiza 1047, Coronel Pringles.'
  WHEN 1609 THEN 'Reporte registrado en Islas Malvinas 260, Coronel Pringles.'
  WHEN 1610 THEN 'Reporte registrado en General Paz 108, Coronel Pringles.'
  WHEN 1611 THEN 'Reporte registrado en 9 de Julio 133, Coronel Pringles.'
  WHEN 1612 THEN 'Reporte registrado en Italia 935, Coronel Pringles.'
  WHEN 1613 THEN 'Reporte registrado en Pellegrini 972, Coronel Pringles.'
  WHEN 1614 THEN 'Reporte registrado en General Paz 160, Coronel Pringles.'
  WHEN 1615 THEN 'Reporte registrado en General Paz 65, Coronel Pringles.'
  WHEN 1616 THEN 'Reporte registrado en Roca 846, Coronel Pringles.'
  WHEN 1617 THEN 'Reporte registrado en Avellaneda 958, Coronel Pringles.'
  WHEN 1618 THEN 'Reporte registrado en 25 de Mayo 421, Coronel Pringles.'
  WHEN 1619 THEN 'Reporte registrado en Garay 311, Coronel Pringles.'
  WHEN 1620 THEN 'Reporte registrado en Necochea 228, Coronel Pringles.'
  WHEN 1621 THEN 'Reporte registrado en Alsina 557, Coronel Pringles.'
  WHEN 1622 THEN 'Reporte registrado en Alsina 61, Coronel Pringles.'
  WHEN 1623 THEN 'Reporte registrado en Sáenz Peña 101, Coronel Pringles.'
  WHEN 1624 THEN 'Reporte registrado en Sarmiento 874, Coronel Pringles.'
  WHEN 1625 THEN 'Reporte registrado en Italia 541, Coronel Pringles.'
  WHEN 1626 THEN 'Reporte registrado en Uruguay 987, Coronel Pringles.'
  WHEN 1627 THEN 'Reporte registrado en Necochea 434, Coronel Pringles.'
  WHEN 1628 THEN 'Reporte registrado en Moreno 1030, Coronel Pringles.'
  WHEN 1629 THEN 'Reporte registrado en Chacabuco 1157, Coronel Pringles.'
  WHEN 1630 THEN 'Reporte registrado en Urquiza 1249, Coronel Pringles.'
  WHEN 1631 THEN 'Reporte registrado en 9 de Julio 626, Coronel Pringles.'
  WHEN 1632 THEN 'Reporte registrado en Sáenz Peña 1209, Coronel Pringles.'
  WHEN 1633 THEN 'Reporte registrado en Mitre 1211, Coronel Pringles.'
  WHEN 1634 THEN 'Reporte registrado en Avellaneda 1360, Coronel Pringles.'
  WHEN 1635 THEN 'Reporte registrado en Islas Malvinas 1043, Coronel Pringles.'
  WHEN 1636 THEN 'Reporte registrado en Urquiza 140, Coronel Pringles.'
  WHEN 1637 THEN 'Reporte registrado en Artigas 297, Coronel Pringles.'
  WHEN 1638 THEN 'Reporte registrado en Sarmiento 607, Coronel Pringles.'
  WHEN 1639 THEN 'Reporte registrado en Lavalle 642, Coronel Pringles.'
  WHEN 1640 THEN 'Reporte registrado en Italia 389, Coronel Pringles.'
  WHEN 1641 THEN 'Reporte registrado en Garay 267, Coronel Pringles.'
  WHEN 1642 THEN 'Reporte registrado en Rodríguez Peña 1040, Coronel Pringles.'
  WHEN 1643 THEN 'Reporte registrado en Sarmiento 1167, Coronel Pringles.'
  WHEN 1644 THEN 'Reporte registrado en Cabrera 478, Coronel Pringles.'
  WHEN 1645 THEN 'Reporte registrado en Bahía Blanca 988, Coronel Pringles.'
  WHEN 1646 THEN 'Reporte registrado en Chacabuco 851, Coronel Pringles.'
  WHEN 1647 THEN 'Reporte registrado en Avellaneda 768, Coronel Pringles.'
  WHEN 1648 THEN 'Reporte registrado en Colón 590, Coronel Pringles.'
  WHEN 1649 THEN 'Reporte registrado en Juan XXIII 357, Coronel Pringles.'
  WHEN 1650 THEN 'Reporte registrado en Mitre 681, Coronel Pringles.'
  WHEN 1651 THEN 'Reporte registrado en Uruguay 267, Coronel Pringles.'
  WHEN 1652 THEN 'Reporte registrado en Juan XXIII 145, Coronel Pringles.'
  WHEN 1653 THEN 'Reporte registrado en 24 de Septiembre 512, Coronel Pringles.'
  WHEN 1654 THEN 'Reporte registrado en Chiclana 1151, Coronel Pringles.'
  WHEN 1655 THEN 'Reporte registrado en 9 de Julio 537, Coronel Pringles.'
  WHEN 1656 THEN 'Reporte registrado en Bahía Blanca 575, Coronel Pringles.'
  WHEN 1657 THEN 'Reporte registrado en Sáenz Peña 876, Coronel Pringles.'
  WHEN 1658 THEN 'Reporte registrado en Chacabuco 498, Coronel Pringles.'
  WHEN 1659 THEN 'Reporte registrado en Islas Malvinas 1071, Coronel Pringles.'
  WHEN 1660 THEN 'Reporte registrado en Tucumán 654, Coronel Pringles.'
  WHEN 1661 THEN 'Reporte registrado en Necochea 1056, Coronel Pringles.'
  WHEN 1662 THEN 'Reporte registrado en Sarmiento 185, Coronel Pringles.'
  WHEN 1663 THEN 'Reporte registrado en Hipólito Yrigoyen 63, Coronel Pringles.'
  WHEN 1664 THEN 'Reporte registrado en Urquiza 617, Coronel Pringles.'
  WHEN 1665 THEN 'Reporte registrado en Juan XXIII 291, Coronel Pringles.'
  WHEN 1666 THEN 'Reporte registrado en Garay 922, Coronel Pringles.'
  WHEN 1667 THEN 'Reporte registrado en 9 de Julio 364, Coronel Pringles.'
  WHEN 1668 THEN 'Reporte registrado en Suárez 75, Coronel Pringles.'
  WHEN 1669 THEN 'Reporte registrado en Pellegrini 80, Coronel Pringles.'
  WHEN 1670 THEN 'Reporte registrado en 15 de Julio 271, Coronel Pringles.'
  WHEN 1671 THEN 'Reporte registrado en 25 de Mayo 263, Coronel Pringles.'
  WHEN 1672 THEN 'Reporte registrado en Bahía Blanca 196, Coronel Pringles.'
  WHEN 1673 THEN 'Reporte registrado en Tucumán 839, Coronel Pringles.'
  WHEN 1674 THEN 'Reporte registrado en José Hernández 542, Coronel Pringles.'
  WHEN 1675 THEN 'Reporte registrado en Sarmiento 1086, Coronel Pringles.'
  WHEN 1676 THEN 'Reporte registrado en Mitre 643, Coronel Pringles.'
  WHEN 1677 THEN 'Reporte registrado en Maipú 26, Coronel Pringles.'
  WHEN 1678 THEN 'Reporte registrado en Maipú 121, Coronel Pringles.'
  WHEN 1679 THEN 'Reporte registrado en Juan XXIII 328, Coronel Pringles.'
  WHEN 1680 THEN 'Reporte registrado en Lavalle 170, Coronel Pringles.'
  WHEN 1681 THEN 'Reporte registrado en Belgrano 1015, Coronel Pringles.'
  WHEN 1682 THEN 'Reporte registrado en Belgrano 661, Coronel Pringles.'
  WHEN 1683 THEN 'Reporte registrado en Garay 1322, Coronel Pringles.'
  WHEN 1684 THEN 'Reporte registrado en Brown 194, Coronel Pringles.'
  WHEN 1685 THEN 'Reporte registrado en 24 de Septiembre 384, Coronel Pringles.'
  WHEN 1686 THEN 'Reporte registrado en San Martín 680, Coronel Pringles.'
  WHEN 1687 THEN 'Reporte registrado en Sáenz Peña 152, Coronel Pringles.'
  WHEN 1688 THEN 'Reporte registrado en San Martín 110, Coronel Pringles.'
  WHEN 1689 THEN 'Reporte registrado en Uruguay 270, Coronel Pringles.'
  WHEN 1690 THEN 'Reporte registrado en Alvear 463, Coronel Pringles.'
  WHEN 1691 THEN 'Reporte registrado en Rodríguez Peña 126, Coronel Pringles.'
  WHEN 1692 THEN 'Reporte registrado en Juan XXIII 97, Coronel Pringles.'
  WHEN 1693 THEN 'Reporte registrado en Dorrego 183, Coronel Pringles.'
  WHEN 1694 THEN 'Reporte registrado en Lavalle 1246, Coronel Pringles.'
  WHEN 1695 THEN 'Reporte registrado en Belgrano 321, Coronel Pringles.'
  WHEN 1696 THEN 'Reporte registrado en Garay 313, Coronel Pringles.'
  WHEN 1697 THEN 'Reporte registrado en Suárez 896, Coronel Pringles.'
  WHEN 1698 THEN 'Reporte registrado en 24 de Septiembre 1313, Coronel Pringles.'
  WHEN 1699 THEN 'Reporte registrado en Lavalle 1278, Coronel Pringles.'
  WHEN 1700 THEN 'Reporte registrado en Rivadavia 806, Coronel Pringles.'
  WHEN 1701 THEN 'Reporte registrado en Artigas 303, Coronel Pringles.'
  WHEN 1702 THEN 'Reporte registrado en Uruguay 267, Coronel Pringles.'
  WHEN 1703 THEN 'Reporte registrado en Italia 299, Coronel Pringles.'
  WHEN 1704 THEN 'Reporte registrado en Lavalle 688, Coronel Pringles.'
  WHEN 1705 THEN 'Reporte registrado en José Ingenieros 1026, Coronel Pringles.'
  WHEN 1706 THEN 'Reporte registrado en Rodríguez Peña 141, Coronel Pringles.'
  WHEN 1707 THEN 'Reporte registrado en 15 de Julio 347, Coronel Pringles.'
  WHEN 1708 THEN 'Reporte registrado en Urquiza 207, Coronel Pringles.'
  WHEN 1709 THEN 'Reporte registrado en Juan XXIII 279, Coronel Pringles.'
  WHEN 1710 THEN 'Reporte registrado en José Ingenieros 796, Coronel Pringles.'
  WHEN 1711 THEN 'Reporte registrado en Belgrano 1066, Coronel Pringles.'
  WHEN 1712 THEN 'Reporte registrado en 15 de Julio 1515, Coronel Pringles.'
  WHEN 1713 THEN 'Reporte registrado en Chacabuco 176, Coronel Pringles.'
  WHEN 1714 THEN 'Reporte registrado en Chiclana 1566, Coronel Pringles.'
  WHEN 1715 THEN 'Reporte registrado en Islas Malvinas 1166, Coronel Pringles.'
  WHEN 1716 THEN 'Reporte registrado en Hipólito Yrigoyen 215, Coronel Pringles.'
  WHEN 1717 THEN 'Reporte registrado en Lavalle 39, Coronel Pringles.'
  WHEN 1718 THEN 'Reporte registrado en José Hernández 69, Coronel Pringles.'
  WHEN 1719 THEN 'Reporte registrado en Necochea 42, Coronel Pringles.'
  WHEN 1720 THEN 'Reporte registrado en Maipú 319, Coronel Pringles.'
  WHEN 1721 THEN 'Reporte registrado en Pellegrini 403, Coronel Pringles.'
  WHEN 1722 THEN 'Reporte registrado en Sáenz Peña 258, Coronel Pringles.'
  WHEN 1723 THEN 'Reporte registrado en Rodríguez Peña 821, Coronel Pringles.'
  WHEN 1724 THEN 'Reporte registrado en Tucumán 705, Coronel Pringles.'
  WHEN 1725 THEN 'Reporte registrado en Sáenz Peña 418, Coronel Pringles.'
  WHEN 1726 THEN 'Reporte registrado en Uruguay 172, Coronel Pringles.'
  WHEN 1727 THEN 'Reporte registrado en 25 de Mayo 1499, Coronel Pringles.'
  WHEN 1728 THEN 'Reporte registrado en Garay 222, Coronel Pringles.'
  WHEN 1729 THEN 'Reporte registrado en Pellegrini 288, Coronel Pringles.'
  WHEN 1730 THEN 'Reporte registrado en Islas Malvinas 942, Coronel Pringles.'
  WHEN 1731 THEN 'Reporte registrado en Italia 1628, Coronel Pringles.'
  WHEN 1732 THEN 'Reporte registrado en Pellegrini 421, Coronel Pringles.'
  WHEN 1733 THEN 'Reporte registrado en Moreno 442, Coronel Pringles.'
  WHEN 1734 THEN 'Reporte registrado en 9 de Julio 502, Coronel Pringles.'
  WHEN 1735 THEN 'Reporte registrado en Dorrego 294, Coronel Pringles.'
  WHEN 1736 THEN 'Reporte registrado en Lavalle 412, Coronel Pringles.'
  WHEN 1737 THEN 'Reporte registrado en José Hernández 734, Coronel Pringles.'
  WHEN 1738 THEN 'Reporte registrado en Belgrano 144, Coronel Pringles.'
  WHEN 1739 THEN 'Reporte registrado en Roca 1008, Coronel Pringles.'
  WHEN 1740 THEN 'Reporte registrado en Alvear 923, Coronel Pringles.'
  WHEN 1741 THEN 'Reporte registrado en Pellegrini 30, Coronel Pringles.'
  WHEN 1742 THEN 'Reporte registrado en 15 de Julio 474, Coronel Pringles.'
  WHEN 1743 THEN 'Reporte registrado en Alsina 3, Coronel Pringles.'
  WHEN 1744 THEN 'Reporte registrado en Urquiza 2, Coronel Pringles.'
  WHEN 1745 THEN 'Reporte registrado en Roca 26, Coronel Pringles.'
  WHEN 1746 THEN 'Reporte registrado en General Paz 69, Coronel Pringles.'
  WHEN 1747 THEN 'Reporte registrado en Juan XXIII 281, Coronel Pringles.'
  WHEN 1748 THEN 'Reporte registrado en Belgrano 587, Coronel Pringles.'
  WHEN 1749 THEN 'Reporte registrado en Dorrego 512, Coronel Pringles.'
  WHEN 1750 THEN 'Reporte registrado en Rivadavia 564, Coronel Pringles.'
  WHEN 1751 THEN 'Reporte registrado en Chacabuco 1161, Coronel Pringles.'
  WHEN 1752 THEN 'Reporte registrado en 15 de Julio 241, Coronel Pringles.'
  WHEN 1753 THEN 'Reporte registrado en Chiclana 967, Coronel Pringles.'
  WHEN 1754 THEN 'Reporte registrado en Tucumán 137, Coronel Pringles.'
  WHEN 1755 THEN 'Reporte registrado en Urquiza 790, Coronel Pringles.'
  WHEN 1756 THEN 'Reporte registrado en Alvear 549, Coronel Pringles.'
  WHEN 1757 THEN 'Reporte registrado en Rivadavia 1705, Coronel Pringles.'
  WHEN 1758 THEN 'Reporte registrado en Pellegrini 397, Coronel Pringles.'
  WHEN 1759 THEN 'Reporte registrado en 9 de Julio 557, Coronel Pringles.'
  WHEN 1760 THEN 'Reporte registrado en Urquiza 891, Coronel Pringles.'
  WHEN 1761 THEN 'Reporte registrado en Alvear 457, Coronel Pringles.'
  WHEN 1762 THEN 'Reporte registrado en 25 de Mayo 48, Coronel Pringles.'
  WHEN 1763 THEN 'Reporte registrado en Urquiza 386, Coronel Pringles.'
  WHEN 1764 THEN 'Reporte registrado en 9 de Julio 275, Coronel Pringles.'
  WHEN 1765 THEN 'Reporte registrado en Lavalle 506, Coronel Pringles.'
  WHEN 1766 THEN 'Reporte registrado en Chiclana 274, Coronel Pringles.'
  WHEN 1767 THEN 'Reporte registrado en Alvear 596, Coronel Pringles.'
  WHEN 1768 THEN 'Reporte registrado en Lavalle 1048, Coronel Pringles.'
  WHEN 1769 THEN 'Reporte registrado en General Paz 241, Coronel Pringles.'
  WHEN 1770 THEN 'Reporte registrado en Maipú 211, Coronel Pringles.'
  WHEN 1771 THEN 'Reporte registrado en Uruguay 114, Coronel Pringles.'
  WHEN 1772 THEN 'Reporte registrado en Avellaneda 908, Coronel Pringles.'
  WHEN 1773 THEN 'Reporte registrado en Garay 206, Coronel Pringles.'
  WHEN 1774 THEN 'Reporte registrado en 9 de Julio 200, Coronel Pringles.'
  WHEN 1775 THEN 'Reporte registrado en 15 de Julio 631, Coronel Pringles.'
  WHEN 1776 THEN 'Reporte registrado en Hipólito Yrigoyen 113, Coronel Pringles.'
  WHEN 1777 THEN 'Reporte registrado en Avellaneda 241, Coronel Pringles.'
  WHEN 1778 THEN 'Reporte registrado en Suárez 610, Coronel Pringles.'
  WHEN 1779 THEN 'Reporte registrado en 24 de Septiembre 255, Coronel Pringles.'
  WHEN 1780 THEN 'Reporte registrado en Chacabuco 236, Coronel Pringles.'
  WHEN 1781 THEN 'Reporte registrado en Artigas 641, Coronel Pringles.'
  WHEN 1782 THEN 'Reporte registrado en Islas Malvinas 288, Coronel Pringles.'
  WHEN 1783 THEN 'Reporte registrado en España 564, Coronel Pringles.'
  WHEN 1784 THEN 'Reporte registrado en Garay 1353, Coronel Pringles.'
  WHEN 1785 THEN 'Reporte registrado en Belgrano 42, Coronel Pringles.'
  WHEN 1786 THEN 'Reporte registrado en Alsina 172, Coronel Pringles.'
  WHEN 1787 THEN 'Reporte registrado en Belgrano 261, Coronel Pringles.'
  WHEN 1788 THEN 'Reporte registrado en Rodríguez Peña 16, Coronel Pringles.'
  WHEN 1789 THEN 'Reporte registrado en Belgrano 1611, Coronel Pringles.'
  WHEN 1790 THEN 'Reporte registrado en Italia 458, Coronel Pringles.'
  WHEN 1791 THEN 'Reporte registrado en 25 de Mayo 480, Coronel Pringles.'
  WHEN 1792 THEN 'Reporte registrado en Garay 24, Coronel Pringles.'
  WHEN 1793 THEN 'Reporte registrado en Cabrera 523, Coronel Pringles.'
  WHEN 1794 THEN 'Reporte registrado en 9 de Julio 122, Coronel Pringles.'
  WHEN 1795 THEN 'Reporte registrado en Colón 1148, Coronel Pringles.'
  WHEN 1796 THEN 'Reporte registrado en Hipólito Yrigoyen 150, Coronel Pringles.'
  WHEN 1797 THEN 'Reporte registrado en Chiclana 740, Coronel Pringles.'
  WHEN 1798 THEN 'Reporte registrado en Pellegrini 90, Coronel Pringles.'
  ELSE 'Reporte general en la vía pública.'
END),
  'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/seed-' || gs || '.jpg',
  (CASE gs
  WHEN 1 THEN -37.985668
  WHEN 2 THEN -37.976067
  WHEN 3 THEN -37.991608
  WHEN 4 THEN -37.980835
  WHEN 5 THEN -37.978039
  WHEN 6 THEN -37.989231
  WHEN 7 THEN -37.987101
  WHEN 8 THEN -38.000110
  WHEN 9 THEN -37.985889
  WHEN 10 THEN -37.992200
  WHEN 11 THEN -37.981813
  WHEN 12 THEN -37.984474
  WHEN 13 THEN -37.987217
  WHEN 14 THEN -37.993463
  WHEN 15 THEN -37.983365
  WHEN 16 THEN -38.003744
  WHEN 17 THEN -38.003983
  WHEN 18 THEN -37.998824
  WHEN 19 THEN -37.977499
  WHEN 20 THEN -37.993781
  WHEN 21 THEN -37.977959
  WHEN 22 THEN -37.995446
  WHEN 23 THEN -37.977371
  WHEN 24 THEN -37.995586
  WHEN 25 THEN -37.986959
  WHEN 26 THEN -37.971354
  WHEN 27 THEN -38.003234
  WHEN 28 THEN -37.989950
  WHEN 29 THEN -37.995877
  WHEN 30 THEN -37.989764
  WHEN 31 THEN -37.987920
  WHEN 32 THEN -37.992483
  WHEN 33 THEN -37.991767
  WHEN 34 THEN -37.975620
  WHEN 35 THEN -37.991386
  WHEN 36 THEN -37.996016
  WHEN 37 THEN -37.993854
  WHEN 38 THEN -37.983635
  WHEN 39 THEN -37.992972
  WHEN 40 THEN -37.991489
  WHEN 41 THEN -37.986215
  WHEN 42 THEN -38.002429
  WHEN 43 THEN -37.995968
  WHEN 44 THEN -37.987494
  WHEN 45 THEN -37.980168
  WHEN 46 THEN -37.991380
  WHEN 47 THEN -37.994404
  WHEN 48 THEN -37.982733
  WHEN 49 THEN -37.995271
  WHEN 50 THEN -37.987495
  WHEN 51 THEN -37.979441
  WHEN 52 THEN -38.002663
  WHEN 53 THEN -37.981291
  WHEN 54 THEN -38.003047
  WHEN 55 THEN -37.998284
  WHEN 56 THEN -37.981808
  WHEN 57 THEN -37.989550
  WHEN 58 THEN -37.987342
  WHEN 59 THEN -37.990441
  WHEN 60 THEN -37.980994
  WHEN 61 THEN -37.992029
  WHEN 62 THEN -37.998192
  WHEN 63 THEN -37.995583
  WHEN 64 THEN -37.996505
  WHEN 65 THEN -37.999121
  WHEN 66 THEN -37.974432
  WHEN 67 THEN -37.996391
  WHEN 68 THEN -37.986868
  WHEN 69 THEN -37.989925
  WHEN 70 THEN -37.986847
  WHEN 71 THEN -37.985442
  WHEN 72 THEN -37.995543
  WHEN 73 THEN -37.990675
  WHEN 74 THEN -37.992054
  WHEN 75 THEN -37.987516
  WHEN 76 THEN -37.995758
  WHEN 77 THEN -37.998520
  WHEN 78 THEN -37.985867
  WHEN 79 THEN -37.983988
  WHEN 80 THEN -37.994086
  WHEN 81 THEN -37.981409
  WHEN 82 THEN -37.991147
  WHEN 83 THEN -37.991712
  WHEN 84 THEN -37.974381
  WHEN 85 THEN -37.988333
  WHEN 86 THEN -37.976950
  WHEN 87 THEN -37.981168
  WHEN 88 THEN -37.992669
  WHEN 89 THEN -37.991337
  WHEN 90 THEN -37.977737
  WHEN 91 THEN -37.979810
  WHEN 92 THEN -37.989019
  WHEN 93 THEN -37.983182
  WHEN 94 THEN -37.981305
  WHEN 95 THEN -37.982754
  WHEN 96 THEN -37.988412
  WHEN 97 THEN -37.994664
  WHEN 98 THEN -37.994641
  WHEN 99 THEN -37.998008
  WHEN 100 THEN -37.988127
  WHEN 101 THEN -37.979625
  WHEN 102 THEN -37.978710
  WHEN 103 THEN -37.989477
  WHEN 104 THEN -37.992690
  WHEN 105 THEN -37.991439
  WHEN 106 THEN -37.987770
  WHEN 107 THEN -37.993845
  WHEN 108 THEN -37.987851
  WHEN 109 THEN -37.988298
  WHEN 110 THEN -37.982327
  WHEN 111 THEN -37.993261
  WHEN 112 THEN -37.985030
  WHEN 113 THEN -37.993723
  WHEN 114 THEN -37.995812
  WHEN 115 THEN -37.987744
  WHEN 116 THEN -37.977634
  WHEN 117 THEN -37.994072
  WHEN 118 THEN -37.977378
  WHEN 119 THEN -37.976550
  WHEN 120 THEN -37.999915
  WHEN 121 THEN -37.987859
  WHEN 122 THEN -37.990716
  WHEN 123 THEN -37.987326
  WHEN 124 THEN -37.984160
  WHEN 125 THEN -37.993282
  WHEN 126 THEN -37.981189
  WHEN 127 THEN -37.998527
  WHEN 128 THEN -38.000707
  WHEN 129 THEN -38.006210
  WHEN 130 THEN -37.979124
  WHEN 131 THEN -37.988446
  WHEN 132 THEN -37.984711
  WHEN 133 THEN -38.004088
  WHEN 134 THEN -37.986053
  WHEN 135 THEN -38.000614
  WHEN 136 THEN -37.986617
  WHEN 137 THEN -37.986761
  WHEN 138 THEN -37.991872
  WHEN 139 THEN -37.990902
  WHEN 140 THEN -37.976029
  WHEN 141 THEN -37.988892
  WHEN 142 THEN -37.978681
  WHEN 143 THEN -37.991889
  WHEN 144 THEN -38.002297
  WHEN 145 THEN -37.987851
  WHEN 146 THEN -37.985158
  WHEN 147 THEN -37.983319
  WHEN 148 THEN -38.000133
  WHEN 149 THEN -37.993839
  WHEN 150 THEN -37.994040
  WHEN 151 THEN -37.989994
  WHEN 152 THEN -37.977064
  WHEN 153 THEN -37.983387
  WHEN 154 THEN -37.989874
  WHEN 155 THEN -37.981846
  WHEN 156 THEN -37.994175
  WHEN 157 THEN -37.992910
  WHEN 158 THEN -37.983736
  WHEN 159 THEN -37.989140
  WHEN 160 THEN -37.988959
  WHEN 161 THEN -37.987344
  WHEN 162 THEN -38.002665
  WHEN 163 THEN -37.998102
  WHEN 164 THEN -37.982473
  WHEN 165 THEN -37.982369
  WHEN 166 THEN -37.992107
  WHEN 167 THEN -37.983805
  WHEN 168 THEN -37.967949
  WHEN 169 THEN -37.982586
  WHEN 170 THEN -37.986918
  WHEN 171 THEN -37.991519
  WHEN 172 THEN -37.987900
  WHEN 173 THEN -37.985965
  WHEN 174 THEN -37.989835
  WHEN 175 THEN -37.992718
  WHEN 176 THEN -37.979365
  WHEN 177 THEN -37.990208
  WHEN 178 THEN -37.995109
  WHEN 179 THEN -37.992789
  WHEN 180 THEN -37.997337
  WHEN 181 THEN -37.985002
  WHEN 182 THEN -37.988314
  WHEN 183 THEN -37.990451
  WHEN 184 THEN -37.998769
  WHEN 185 THEN -37.991716
  WHEN 186 THEN -37.989525
  WHEN 187 THEN -37.988025
  WHEN 188 THEN -37.972846
  WHEN 189 THEN -37.986325
  WHEN 190 THEN -37.978259
  WHEN 191 THEN -37.987799
  WHEN 192 THEN -37.991705
  WHEN 193 THEN -37.987326
  WHEN 194 THEN -37.996742
  WHEN 195 THEN -37.990832
  WHEN 196 THEN -37.999309
  WHEN 197 THEN -37.981800
  WHEN 198 THEN -37.983589
  WHEN 199 THEN -37.979123
  WHEN 200 THEN -38.005057
  WHEN 201 THEN -37.984122
  WHEN 202 THEN -37.990738
  WHEN 203 THEN -37.984766
  WHEN 204 THEN -37.974110
  WHEN 205 THEN -37.985294
  WHEN 206 THEN -37.990804
  WHEN 207 THEN -37.994833
  WHEN 208 THEN -37.982535
  WHEN 209 THEN -37.975257
  WHEN 210 THEN -38.005224
  WHEN 211 THEN -37.983547
  WHEN 212 THEN -37.986400
  WHEN 213 THEN -37.993464
  WHEN 214 THEN -37.978278
  WHEN 215 THEN -37.989018
  WHEN 216 THEN -37.989596
  WHEN 217 THEN -37.982903
  WHEN 218 THEN -37.985657
  WHEN 219 THEN -37.992109
  WHEN 220 THEN -37.982298
  WHEN 221 THEN -37.986413
  WHEN 222 THEN -37.986260
  WHEN 223 THEN -37.986959
  WHEN 224 THEN -37.981385
  WHEN 225 THEN -37.985933
  WHEN 226 THEN -37.998476
  WHEN 227 THEN -37.982209
  WHEN 228 THEN -37.992519
  WHEN 229 THEN -37.976131
  WHEN 230 THEN -37.985308
  WHEN 231 THEN -37.988502
  WHEN 232 THEN -37.981990
  WHEN 233 THEN -37.988767
  WHEN 234 THEN -37.994217
  WHEN 235 THEN -37.982228
  WHEN 236 THEN -37.986941
  WHEN 237 THEN -37.992004
  WHEN 238 THEN -37.990843
  WHEN 239 THEN -37.978362
  WHEN 240 THEN -37.992419
  WHEN 241 THEN -37.997097
  WHEN 242 THEN -37.988016
  WHEN 243 THEN -37.995988
  WHEN 244 THEN -37.988243
  WHEN 245 THEN -37.987400
  WHEN 246 THEN -37.986253
  WHEN 247 THEN -37.983418
  WHEN 248 THEN -37.986911
  WHEN 249 THEN -37.999888
  WHEN 250 THEN -37.983688
  WHEN 251 THEN -37.992569
  WHEN 252 THEN -37.999652
  WHEN 253 THEN -37.994155
  WHEN 254 THEN -37.990761
  WHEN 255 THEN -37.987029
  WHEN 256 THEN -37.981082
  WHEN 257 THEN -37.987607
  WHEN 258 THEN -37.985646
  WHEN 259 THEN -37.994168
  WHEN 260 THEN -37.989406
  WHEN 261 THEN -37.985688
  WHEN 262 THEN -37.984187
  WHEN 263 THEN -37.976352
  WHEN 264 THEN -37.997954
  WHEN 265 THEN -37.998360
  WHEN 266 THEN -37.987062
  WHEN 267 THEN -37.993963
  WHEN 268 THEN -37.993443
  WHEN 269 THEN -37.986703
  WHEN 270 THEN -37.987163
  WHEN 271 THEN -37.983057
  WHEN 272 THEN -37.978738
  WHEN 273 THEN -37.975208
  WHEN 274 THEN -38.000033
  WHEN 275 THEN -37.980766
  WHEN 276 THEN -37.981897
  WHEN 277 THEN -37.980121
  WHEN 278 THEN -37.987110
  WHEN 279 THEN -37.989637
  WHEN 280 THEN -37.991401
  WHEN 281 THEN -37.988492
  WHEN 282 THEN -37.981242
  WHEN 283 THEN -37.991104
  WHEN 284 THEN -37.987237
  WHEN 285 THEN -37.988085
  WHEN 286 THEN -37.986352
  WHEN 287 THEN -37.989647
  WHEN 288 THEN -37.982033
  WHEN 289 THEN -37.984159
  WHEN 290 THEN -37.991162
  WHEN 291 THEN -38.001407
  WHEN 292 THEN -37.999719
  WHEN 293 THEN -37.988400
  WHEN 294 THEN -37.978288
  WHEN 295 THEN -37.981757
  WHEN 296 THEN -38.004829
  WHEN 297 THEN -37.974962
  WHEN 298 THEN -37.987893
  WHEN 299 THEN -37.997109
  WHEN 300 THEN -37.977459
  WHEN 301 THEN -37.980278
  WHEN 302 THEN -37.983631
  WHEN 303 THEN -37.985353
  WHEN 304 THEN -37.995657
  WHEN 305 THEN -37.985421
  WHEN 306 THEN -37.991454
  WHEN 307 THEN -37.985120
  WHEN 308 THEN -37.972977
  WHEN 309 THEN -37.973149
  WHEN 310 THEN -37.996982
  WHEN 311 THEN -37.978053
  WHEN 312 THEN -37.992694
  WHEN 313 THEN -37.992735
  WHEN 314 THEN -37.990963
  WHEN 315 THEN -37.995838
  WHEN 316 THEN -37.998364
  WHEN 317 THEN -37.995763
  WHEN 318 THEN -37.995502
  WHEN 319 THEN -37.985623
  WHEN 320 THEN -37.976629
  WHEN 321 THEN -37.989301
  WHEN 322 THEN -37.992678
  WHEN 323 THEN -37.991290
  WHEN 324 THEN -37.987901
  WHEN 325 THEN -37.976719
  WHEN 326 THEN -37.995107
  WHEN 327 THEN -37.994819
  WHEN 328 THEN -37.992594
  WHEN 329 THEN -37.994171
  WHEN 330 THEN -37.977455
  WHEN 331 THEN -37.985307
  WHEN 332 THEN -37.989766
  WHEN 333 THEN -37.984041
  WHEN 334 THEN -37.985485
  WHEN 335 THEN -37.974160
  WHEN 336 THEN -37.989673
  WHEN 337 THEN -37.997870
  WHEN 338 THEN -38.000170
  WHEN 339 THEN -37.984528
  WHEN 340 THEN -37.993111
  WHEN 341 THEN -37.997695
  WHEN 342 THEN -37.984866
  WHEN 343 THEN -37.989218
  WHEN 344 THEN -37.999309
  WHEN 345 THEN -37.989661
  WHEN 346 THEN -37.981536
  WHEN 347 THEN -37.997856
  WHEN 348 THEN -37.977885
  WHEN 349 THEN -37.976955
  WHEN 350 THEN -37.980774
  WHEN 351 THEN -37.990787
  WHEN 352 THEN -37.997550
  WHEN 353 THEN -37.989034
  WHEN 354 THEN -37.987429
  WHEN 355 THEN -37.979842
  WHEN 356 THEN -37.979704
  WHEN 357 THEN -37.987493
  WHEN 358 THEN -37.993289
  WHEN 359 THEN -37.995941
  WHEN 360 THEN -38.001877
  WHEN 361 THEN -37.990668
  WHEN 362 THEN -37.984731
  WHEN 363 THEN -37.988365
  WHEN 364 THEN -37.997476
  WHEN 365 THEN -37.988492
  WHEN 366 THEN -37.994670
  WHEN 367 THEN -37.998345
  WHEN 368 THEN -37.979149
  WHEN 369 THEN -37.974710
  WHEN 370 THEN -37.994511
  WHEN 371 THEN -37.987613
  WHEN 372 THEN -37.998576
  WHEN 373 THEN -37.990243
  WHEN 374 THEN -37.988875
  WHEN 375 THEN -37.977956
  WHEN 376 THEN -37.990507
  WHEN 377 THEN -37.980530
  WHEN 378 THEN -37.984934
  WHEN 379 THEN -37.977283
  WHEN 380 THEN -37.987993
  WHEN 381 THEN -37.996296
  WHEN 382 THEN -38.007256
  WHEN 383 THEN -37.989764
  WHEN 384 THEN -37.989395
  WHEN 385 THEN -37.999538
  WHEN 386 THEN -37.985292
  WHEN 387 THEN -37.990815
  WHEN 388 THEN -37.996707
  WHEN 389 THEN -37.982818
  WHEN 390 THEN -37.972124
  WHEN 391 THEN -37.991126
  WHEN 392 THEN -38.005251
  WHEN 393 THEN -37.989281
  WHEN 394 THEN -37.987366
  WHEN 395 THEN -37.978831
  WHEN 396 THEN -37.997438
  WHEN 397 THEN -37.986186
  WHEN 398 THEN -37.981422
  WHEN 399 THEN -37.994982
  WHEN 400 THEN -37.989091
  WHEN 401 THEN -37.981920
  WHEN 402 THEN -37.988326
  WHEN 403 THEN -37.987272
  WHEN 404 THEN -37.972968
  WHEN 405 THEN -37.992820
  WHEN 406 THEN -37.995061
  WHEN 407 THEN -37.982946
  WHEN 408 THEN -37.976352
  WHEN 409 THEN -37.982502
  WHEN 410 THEN -37.973548
  WHEN 411 THEN -37.978939
  WHEN 412 THEN -37.993872
  WHEN 413 THEN -37.984110
  WHEN 414 THEN -37.986974
  WHEN 415 THEN -37.999380
  WHEN 416 THEN -37.975950
  WHEN 417 THEN -37.978911
  WHEN 418 THEN -38.002097
  WHEN 419 THEN -37.978257
  WHEN 420 THEN -37.983248
  WHEN 421 THEN -37.982940
  WHEN 422 THEN -37.983695
  WHEN 423 THEN -37.980839
  WHEN 424 THEN -37.984783
  WHEN 425 THEN -37.993763
  WHEN 426 THEN -37.977170
  WHEN 427 THEN -37.993063
  WHEN 428 THEN -37.984823
  WHEN 429 THEN -37.988590
  WHEN 430 THEN -37.997610
  WHEN 431 THEN -37.992221
  WHEN 432 THEN -37.996535
  WHEN 433 THEN -37.995451
  WHEN 434 THEN -37.993720
  WHEN 435 THEN -37.986031
  WHEN 436 THEN -37.995044
  WHEN 437 THEN -37.992949
  WHEN 438 THEN -37.992568
  WHEN 439 THEN -37.991568
  WHEN 440 THEN -37.990262
  WHEN 441 THEN -37.995963
  WHEN 442 THEN -37.993066
  WHEN 443 THEN -37.985407
  WHEN 444 THEN -37.995757
  WHEN 445 THEN -37.986605
  WHEN 446 THEN -37.982894
  WHEN 447 THEN -37.986823
  WHEN 448 THEN -37.990054
  WHEN 449 THEN -37.984057
  WHEN 450 THEN -37.994073
  WHEN 451 THEN -37.989755
  WHEN 452 THEN -38.006324
  WHEN 453 THEN -37.999819
  WHEN 454 THEN -37.991880
  WHEN 455 THEN -37.977434
  WHEN 456 THEN -37.989187
  WHEN 457 THEN -37.982581
  WHEN 458 THEN -37.993508
  WHEN 459 THEN -37.987510
  WHEN 460 THEN -37.995569
  WHEN 461 THEN -37.996215
  WHEN 462 THEN -37.982536
  WHEN 463 THEN -37.982661
  WHEN 464 THEN -38.002130
  WHEN 465 THEN -37.994814
  WHEN 466 THEN -37.982764
  WHEN 467 THEN -37.992700
  WHEN 468 THEN -37.983693
  WHEN 469 THEN -37.989381
  WHEN 470 THEN -37.986375
  WHEN 471 THEN -37.992174
  WHEN 472 THEN -37.976382
  WHEN 473 THEN -37.983220
  WHEN 474 THEN -37.985319
  WHEN 475 THEN -37.984713
  WHEN 476 THEN -37.986611
  WHEN 477 THEN -37.988144
  WHEN 478 THEN -37.980714
  WHEN 479 THEN -37.989739
  WHEN 480 THEN -37.985703
  WHEN 481 THEN -37.991998
  WHEN 482 THEN -37.994936
  WHEN 483 THEN -37.994315
  WHEN 484 THEN -37.975021
  WHEN 485 THEN -37.997310
  WHEN 486 THEN -37.983005
  WHEN 487 THEN -37.990580
  WHEN 488 THEN -37.992957
  WHEN 489 THEN -37.994134
  WHEN 490 THEN -37.994633
  WHEN 491 THEN -37.983590
  WHEN 492 THEN -37.982120
  WHEN 493 THEN -37.979955
  WHEN 494 THEN -37.985727
  WHEN 495 THEN -37.982011
  WHEN 496 THEN -37.986747
  WHEN 497 THEN -37.990789
  WHEN 498 THEN -37.992220
  WHEN 499 THEN -37.995904
  WHEN 500 THEN -37.991202
  WHEN 501 THEN -37.985252
  WHEN 502 THEN -37.984445
  WHEN 503 THEN -37.994594
  WHEN 504 THEN -37.992431
  WHEN 505 THEN -37.976865
  WHEN 506 THEN -37.986224
  WHEN 507 THEN -37.998085
  WHEN 508 THEN -37.984594
  WHEN 509 THEN -37.980488
  WHEN 510 THEN -37.976104
  WHEN 511 THEN -37.993814
  WHEN 512 THEN -37.996444
  WHEN 513 THEN -37.992775
  WHEN 514 THEN -37.978807
  WHEN 515 THEN -37.980666
  WHEN 516 THEN -37.985989
  WHEN 517 THEN -37.994271
  WHEN 518 THEN -37.969917
  WHEN 519 THEN -37.989280
  WHEN 520 THEN -37.998548
  WHEN 521 THEN -37.990156
  WHEN 522 THEN -37.981259
  WHEN 523 THEN -37.981702
  WHEN 524 THEN -37.987126
  WHEN 525 THEN -37.974276
  WHEN 526 THEN -37.998996
  WHEN 527 THEN -37.990284
  WHEN 528 THEN -37.987050
  WHEN 529 THEN -37.980544
  WHEN 530 THEN -38.000097
  WHEN 531 THEN -37.982209
  WHEN 532 THEN -37.996525
  WHEN 533 THEN -37.977558
  WHEN 534 THEN -37.978790
  WHEN 535 THEN -37.971595
  WHEN 536 THEN -37.995969
  WHEN 537 THEN -37.992185
  WHEN 538 THEN -37.985817
  WHEN 539 THEN -37.998548
  WHEN 540 THEN -37.992831
  WHEN 541 THEN -37.980248
  WHEN 542 THEN -37.983878
  WHEN 543 THEN -37.992475
  WHEN 544 THEN -37.983052
  WHEN 545 THEN -37.995698
  WHEN 546 THEN -37.987465
  WHEN 547 THEN -37.987465
  WHEN 548 THEN -37.993045
  WHEN 549 THEN -37.995693
  WHEN 550 THEN -37.981259
  WHEN 551 THEN -37.990973
  WHEN 552 THEN -37.974681
  WHEN 553 THEN -37.989653
  WHEN 554 THEN -37.986397
  WHEN 555 THEN -37.985065
  WHEN 556 THEN -37.985711
  WHEN 557 THEN -37.981273
  WHEN 558 THEN -38.001008
  WHEN 559 THEN -37.976343
  WHEN 560 THEN -38.000775
  WHEN 561 THEN -37.999346
  WHEN 562 THEN -37.996976
  WHEN 563 THEN -37.989227
  WHEN 564 THEN -37.981290
  WHEN 565 THEN -37.995010
  WHEN 566 THEN -37.984269
  WHEN 567 THEN -37.992311
  WHEN 568 THEN -37.980027
  WHEN 569 THEN -37.995735
  WHEN 570 THEN -37.983182
  WHEN 571 THEN -37.986278
  WHEN 572 THEN -37.992435
  WHEN 573 THEN -37.998086
  WHEN 574 THEN -37.987537
  WHEN 575 THEN -37.985956
  WHEN 576 THEN -37.992451
  WHEN 577 THEN -37.981202
  WHEN 578 THEN -37.993751
  WHEN 579 THEN -37.991400
  WHEN 580 THEN -37.988472
  WHEN 581 THEN -37.981844
  WHEN 582 THEN -37.983364
  WHEN 583 THEN -37.988231
  WHEN 584 THEN -37.987087
  WHEN 585 THEN -37.990494
  WHEN 586 THEN -37.982926
  WHEN 587 THEN -37.992339
  WHEN 588 THEN -37.986040
  WHEN 589 THEN -37.976423
  WHEN 590 THEN -37.970809
  WHEN 591 THEN -37.995876
  WHEN 592 THEN -37.995848
  WHEN 593 THEN -37.991240
  WHEN 594 THEN -37.991555
  WHEN 595 THEN -37.991505
  WHEN 596 THEN -37.988863
  WHEN 597 THEN -37.984965
  WHEN 598 THEN -38.002736
  WHEN 599 THEN -37.986413
  WHEN 600 THEN -38.001854
  WHEN 601 THEN -37.987581
  WHEN 602 THEN -37.991011
  WHEN 603 THEN -37.996231
  WHEN 604 THEN -38.001379
  WHEN 605 THEN -37.993631
  WHEN 606 THEN -37.988710
  WHEN 607 THEN -37.998760
  WHEN 608 THEN -37.991687
  WHEN 609 THEN -37.986798
  WHEN 610 THEN -37.978755
  WHEN 611 THEN -37.998726
  WHEN 612 THEN -37.997637
  WHEN 613 THEN -37.986946
  WHEN 614 THEN -37.988312
  WHEN 615 THEN -37.994506
  WHEN 616 THEN -37.986071
  WHEN 617 THEN -37.990857
  WHEN 618 THEN -37.987401
  WHEN 619 THEN -37.992615
  WHEN 620 THEN -38.005645
  WHEN 621 THEN -37.986734
  WHEN 622 THEN -37.992726
  WHEN 623 THEN -37.997083
  WHEN 624 THEN -37.985871
  WHEN 625 THEN -37.978762
  WHEN 626 THEN -37.977932
  WHEN 627 THEN -37.996769
  WHEN 628 THEN -38.000559
  WHEN 629 THEN -37.994733
  WHEN 630 THEN -37.989428
  WHEN 631 THEN -37.994108
  WHEN 632 THEN -37.987916
  WHEN 633 THEN -37.992448
  WHEN 634 THEN -37.980706
  WHEN 635 THEN -37.978206
  WHEN 636 THEN -37.988057
  WHEN 637 THEN -37.987714
  WHEN 638 THEN -37.987769
  WHEN 639 THEN -37.998430
  WHEN 640 THEN -37.991531
  WHEN 641 THEN -37.991412
  WHEN 642 THEN -37.984795
  WHEN 643 THEN -37.972757
  WHEN 644 THEN -37.994232
  WHEN 645 THEN -37.987800
  WHEN 646 THEN -37.975849
  WHEN 647 THEN -37.995300
  WHEN 648 THEN -37.990378
  WHEN 649 THEN -37.997905
  WHEN 650 THEN -37.989991
  WHEN 651 THEN -37.991371
  WHEN 652 THEN -37.991917
  WHEN 653 THEN -37.977129
  WHEN 654 THEN -37.988040
  WHEN 655 THEN -37.982965
  WHEN 656 THEN -37.984113
  WHEN 657 THEN -37.987245
  WHEN 658 THEN -37.986153
  WHEN 659 THEN -37.992927
  WHEN 660 THEN -37.971292
  WHEN 661 THEN -37.980109
  WHEN 662 THEN -37.977996
  WHEN 663 THEN -37.993852
  WHEN 664 THEN -37.975922
  WHEN 665 THEN -37.981919
  WHEN 666 THEN -37.991154
  WHEN 667 THEN -37.999231
  WHEN 668 THEN -37.988259
  WHEN 669 THEN -37.988401
  WHEN 670 THEN -37.989162
  WHEN 671 THEN -37.997581
  WHEN 672 THEN -37.983923
  WHEN 673 THEN -37.972407
  WHEN 674 THEN -37.992005
  WHEN 675 THEN -37.980730
  WHEN 676 THEN -37.983499
  WHEN 677 THEN -37.985474
  WHEN 678 THEN -37.994507
  WHEN 679 THEN -37.992294
  WHEN 680 THEN -37.990549
  WHEN 681 THEN -37.989201
  WHEN 682 THEN -37.987115
  WHEN 683 THEN -37.988246
  WHEN 684 THEN -37.987036
  WHEN 685 THEN -37.983903
  WHEN 686 THEN -37.996582
  WHEN 687 THEN -37.992949
  WHEN 688 THEN -37.981244
  WHEN 689 THEN -37.987424
  WHEN 690 THEN -37.987832
  WHEN 691 THEN -37.993825
  WHEN 692 THEN -37.984152
  WHEN 693 THEN -37.989482
  WHEN 694 THEN -37.994013
  WHEN 695 THEN -37.982221
  WHEN 696 THEN -38.001229
  WHEN 697 THEN -38.000477
  WHEN 698 THEN -37.993780
  WHEN 699 THEN -37.995583
  WHEN 700 THEN -37.973781
  WHEN 701 THEN -37.985111
  WHEN 702 THEN -37.995582
  WHEN 703 THEN -37.988948
  WHEN 704 THEN -37.978110
  WHEN 705 THEN -37.989300
  WHEN 706 THEN -37.992484
  WHEN 707 THEN -37.981549
  WHEN 708 THEN -37.984685
  WHEN 709 THEN -37.990318
  WHEN 710 THEN -38.004118
  WHEN 711 THEN -37.986084
  WHEN 712 THEN -37.980587
  WHEN 713 THEN -37.993173
  WHEN 714 THEN -37.980630
  WHEN 715 THEN -37.999857
  WHEN 716 THEN -37.991102
  WHEN 717 THEN -37.992766
  WHEN 718 THEN -37.999742
  WHEN 719 THEN -37.984287
  WHEN 720 THEN -37.984990
  WHEN 721 THEN -37.982633
  WHEN 722 THEN -37.996928
  WHEN 723 THEN -37.985297
  WHEN 724 THEN -37.986816
  WHEN 725 THEN -37.988100
  WHEN 726 THEN -38.004269
  WHEN 727 THEN -37.978702
  WHEN 728 THEN -37.994808
  WHEN 729 THEN -37.998997
  WHEN 730 THEN -37.981805
  WHEN 731 THEN -37.986055
  WHEN 732 THEN -37.984772
  WHEN 733 THEN -37.980579
  WHEN 734 THEN -37.982994
  WHEN 735 THEN -37.988160
  WHEN 736 THEN -37.986052
  WHEN 737 THEN -37.990345
  WHEN 738 THEN -37.985847
  WHEN 739 THEN -37.997657
  WHEN 740 THEN -37.972920
  WHEN 741 THEN -37.991325
  WHEN 742 THEN -37.994790
  WHEN 743 THEN -37.997313
  WHEN 744 THEN -37.997964
  WHEN 745 THEN -37.991106
  WHEN 746 THEN -37.989221
  WHEN 747 THEN -37.996404
  WHEN 748 THEN -37.983987
  WHEN 749 THEN -37.972715
  WHEN 750 THEN -38.000118
  WHEN 751 THEN -37.979051
  WHEN 752 THEN -37.986761
  WHEN 753 THEN -37.978354
  WHEN 754 THEN -37.982083
  WHEN 755 THEN -37.980633
  WHEN 756 THEN -37.984258
  WHEN 757 THEN -37.984745
  WHEN 758 THEN -37.983314
  WHEN 759 THEN -37.994964
  WHEN 760 THEN -38.000557
  WHEN 761 THEN -37.986877
  WHEN 762 THEN -37.977327
  WHEN 763 THEN -37.988333
  WHEN 764 THEN -37.991704
  WHEN 765 THEN -37.998509
  WHEN 766 THEN -37.991789
  WHEN 767 THEN -37.976281
  WHEN 768 THEN -37.990952
  WHEN 769 THEN -37.994154
  WHEN 770 THEN -37.984528
  WHEN 771 THEN -37.991645
  WHEN 772 THEN -37.996289
  WHEN 773 THEN -38.002414
  WHEN 774 THEN -37.971204
  WHEN 775 THEN -37.984704
  WHEN 776 THEN -37.990015
  WHEN 777 THEN -37.980422
  WHEN 778 THEN -37.989917
  WHEN 779 THEN -37.992551
  WHEN 780 THEN -37.985964
  WHEN 781 THEN -37.976704
  WHEN 782 THEN -37.987229
  WHEN 783 THEN -37.991767
  WHEN 784 THEN -37.993326
  WHEN 785 THEN -37.997697
  WHEN 786 THEN -37.998401
  WHEN 787 THEN -37.989302
  WHEN 788 THEN -37.998331
  WHEN 789 THEN -37.974839
  WHEN 790 THEN -38.000054
  WHEN 791 THEN -37.991657
  WHEN 792 THEN -37.981993
  WHEN 793 THEN -37.990564
  WHEN 794 THEN -37.981173
  WHEN 795 THEN -37.990294
  WHEN 796 THEN -37.984033
  WHEN 797 THEN -37.992900
  WHEN 798 THEN -37.984422
  WHEN 799 THEN -37.985216
  WHEN 800 THEN -37.982367
  WHEN 801 THEN -37.988238
  WHEN 802 THEN -37.989800
  WHEN 803 THEN -37.991811
  WHEN 804 THEN -37.989532
  WHEN 805 THEN -37.979098
  WHEN 806 THEN -37.985070
  WHEN 807 THEN -37.991780
  WHEN 808 THEN -37.993105
  WHEN 809 THEN -37.979359
  WHEN 810 THEN -37.990704
  WHEN 811 THEN -37.984647
  WHEN 812 THEN -37.980684
  WHEN 813 THEN -37.995575
  WHEN 814 THEN -37.974745
  WHEN 815 THEN -37.998685
  WHEN 816 THEN -37.992942
  WHEN 817 THEN -37.985915
  WHEN 818 THEN -37.992107
  WHEN 819 THEN -37.986035
  WHEN 820 THEN -37.999880
  WHEN 821 THEN -37.993167
  WHEN 822 THEN -37.985525
  WHEN 823 THEN -37.987288
  WHEN 824 THEN -37.991165
  WHEN 825 THEN -37.980543
  WHEN 826 THEN -38.006269
  WHEN 827 THEN -37.987457
  WHEN 828 THEN -37.993641
  WHEN 829 THEN -37.986680
  WHEN 830 THEN -37.971064
  WHEN 831 THEN -37.986247
  WHEN 832 THEN -37.987138
  WHEN 833 THEN -37.995462
  WHEN 834 THEN -37.996743
  WHEN 835 THEN -37.987157
  WHEN 836 THEN -37.975715
  WHEN 837 THEN -37.997722
  WHEN 838 THEN -37.980152
  WHEN 839 THEN -37.990272
  WHEN 840 THEN -38.003013
  WHEN 841 THEN -37.996464
  WHEN 842 THEN -37.990489
  WHEN 843 THEN -37.987065
  WHEN 844 THEN -38.001398
  WHEN 845 THEN -37.987751
  WHEN 846 THEN -37.987057
  WHEN 847 THEN -37.989398
  WHEN 848 THEN -37.989345
  WHEN 849 THEN -37.980249
  WHEN 850 THEN -37.986703
  WHEN 851 THEN -38.002141
  WHEN 852 THEN -37.990843
  WHEN 853 THEN -37.976338
  WHEN 854 THEN -37.989333
  WHEN 855 THEN -37.974856
  WHEN 856 THEN -37.986302
  WHEN 857 THEN -37.988175
  WHEN 858 THEN -37.978774
  WHEN 859 THEN -37.998657
  WHEN 860 THEN -37.995084
  WHEN 861 THEN -37.981302
  WHEN 862 THEN -37.996302
  WHEN 863 THEN -37.978491
  WHEN 864 THEN -37.992565
  WHEN 865 THEN -37.981293
  WHEN 866 THEN -37.981815
  WHEN 867 THEN -37.998919
  WHEN 868 THEN -37.996590
  WHEN 869 THEN -37.985404
  WHEN 870 THEN -37.987895
  WHEN 871 THEN -37.991834
  WHEN 872 THEN -37.974689
  WHEN 873 THEN -37.986438
  WHEN 874 THEN -38.007735
  WHEN 875 THEN -37.998538
  WHEN 876 THEN -37.996678
  WHEN 877 THEN -37.988427
  WHEN 878 THEN -37.979767
  WHEN 879 THEN -37.983059
  WHEN 880 THEN -37.973597
  WHEN 881 THEN -38.002424
  WHEN 882 THEN -37.997505
  WHEN 883 THEN -37.988915
  WHEN 884 THEN -37.992747
  WHEN 885 THEN -37.985421
  WHEN 886 THEN -37.988243
  WHEN 887 THEN -37.991999
  WHEN 888 THEN -37.999451
  WHEN 889 THEN -37.981593
  WHEN 890 THEN -37.977489
  WHEN 891 THEN -37.989079
  WHEN 892 THEN -37.978420
  WHEN 893 THEN -37.990771
  WHEN 894 THEN -37.992247
  WHEN 895 THEN -37.995434
  WHEN 896 THEN -37.984344
  WHEN 897 THEN -37.997678
  WHEN 898 THEN -37.975130
  WHEN 899 THEN -37.999566
  WHEN 900 THEN -37.999579
  WHEN 901 THEN -37.992916
  WHEN 902 THEN -37.987979
  WHEN 903 THEN -37.989952
  WHEN 904 THEN -37.987186
  WHEN 905 THEN -37.994304
  WHEN 906 THEN -37.998804
  WHEN 907 THEN -37.995603
  WHEN 908 THEN -37.984280
  WHEN 909 THEN -37.984195
  WHEN 910 THEN -37.995963
  WHEN 911 THEN -37.983742
  WHEN 912 THEN -37.983310
  WHEN 913 THEN -37.976097
  WHEN 914 THEN -37.977358
  WHEN 915 THEN -37.983206
  WHEN 916 THEN -37.989738
  WHEN 917 THEN -38.000955
  WHEN 918 THEN -37.994709
  WHEN 919 THEN -37.977195
  WHEN 920 THEN -37.989922
  WHEN 921 THEN -37.987190
  WHEN 922 THEN -37.983749
  WHEN 923 THEN -37.994983
  WHEN 924 THEN -37.987029
  WHEN 925 THEN -37.985528
  WHEN 926 THEN -38.001624
  WHEN 927 THEN -37.984513
  WHEN 928 THEN -37.994794
  WHEN 929 THEN -37.977834
  WHEN 930 THEN -37.985880
  WHEN 931 THEN -37.995170
  WHEN 932 THEN -37.998459
  WHEN 933 THEN -37.998502
  WHEN 934 THEN -37.992042
  WHEN 935 THEN -37.994280
  WHEN 936 THEN -37.983017
  WHEN 937 THEN -37.985224
  WHEN 938 THEN -37.986883
  WHEN 939 THEN -37.984928
  WHEN 940 THEN -37.992309
  WHEN 941 THEN -37.991241
  WHEN 942 THEN -37.982944
  WHEN 943 THEN -37.975503
  WHEN 944 THEN -37.984198
  WHEN 945 THEN -37.988146
  WHEN 946 THEN -37.981078
  WHEN 947 THEN -37.993506
  WHEN 948 THEN -37.991618
  WHEN 949 THEN -37.977258
  WHEN 950 THEN -37.998516
  WHEN 951 THEN -37.981955
  WHEN 952 THEN -37.989179
  WHEN 953 THEN -37.996025
  WHEN 954 THEN -37.985307
  WHEN 955 THEN -37.985625
  WHEN 956 THEN -37.976119
  WHEN 957 THEN -37.979339
  WHEN 958 THEN -37.975212
  WHEN 959 THEN -37.999732
  WHEN 960 THEN -37.987914
  WHEN 961 THEN -37.986342
  WHEN 962 THEN -37.993979
  WHEN 963 THEN -37.998293
  WHEN 964 THEN -37.994490
  WHEN 965 THEN -37.991441
  WHEN 966 THEN -37.988965
  WHEN 967 THEN -37.988991
  WHEN 968 THEN -37.983282
  WHEN 969 THEN -37.991319
  WHEN 970 THEN -38.001941
  WHEN 971 THEN -37.985037
  WHEN 972 THEN -37.987777
  WHEN 973 THEN -37.989826
  WHEN 974 THEN -37.995079
  WHEN 975 THEN -37.978210
  WHEN 976 THEN -37.986819
  WHEN 977 THEN -37.996794
  WHEN 978 THEN -37.992336
  WHEN 979 THEN -37.987528
  WHEN 980 THEN -38.003272
  WHEN 981 THEN -37.986214
  WHEN 982 THEN -37.980845
  WHEN 983 THEN -37.987604
  WHEN 984 THEN -37.986519
  WHEN 985 THEN -37.995027
  WHEN 986 THEN -37.987605
  WHEN 987 THEN -37.991599
  WHEN 988 THEN -38.001281
  WHEN 989 THEN -37.984549
  WHEN 990 THEN -37.980884
  WHEN 991 THEN -38.001448
  WHEN 992 THEN -37.981934
  WHEN 993 THEN -37.975000
  WHEN 994 THEN -37.991980
  WHEN 995 THEN -37.992513
  WHEN 996 THEN -37.999127
  WHEN 997 THEN -38.000230
  WHEN 998 THEN -37.997613
  WHEN 999 THEN -37.987876
  WHEN 1000 THEN -37.984765
  WHEN 1001 THEN -37.988567
  WHEN 1002 THEN -37.986808
  WHEN 1003 THEN -37.982131
  WHEN 1004 THEN -37.997407
  WHEN 1005 THEN -37.997515
  WHEN 1006 THEN -37.999333
  WHEN 1007 THEN -37.985287
  WHEN 1008 THEN -37.984429
  WHEN 1009 THEN -37.996670
  WHEN 1010 THEN -37.987810
  WHEN 1011 THEN -37.996591
  WHEN 1012 THEN -37.986996
  WHEN 1013 THEN -37.992048
  WHEN 1014 THEN -37.988863
  WHEN 1015 THEN -37.989239
  WHEN 1016 THEN -37.995717
  WHEN 1017 THEN -37.985600
  WHEN 1018 THEN -37.995755
  WHEN 1019 THEN -37.984233
  WHEN 1020 THEN -37.978186
  WHEN 1021 THEN -37.981937
  WHEN 1022 THEN -37.996433
  WHEN 1023 THEN -37.969652
  WHEN 1024 THEN -37.977291
  WHEN 1025 THEN -37.998350
  WHEN 1026 THEN -37.989025
  WHEN 1027 THEN -37.990138
  WHEN 1028 THEN -37.993446
  WHEN 1029 THEN -37.976541
  WHEN 1030 THEN -37.977736
  WHEN 1031 THEN -37.986408
  WHEN 1032 THEN -37.997288
  WHEN 1033 THEN -37.985235
  WHEN 1034 THEN -37.993509
  WHEN 1035 THEN -38.002928
  WHEN 1036 THEN -37.978257
  WHEN 1037 THEN -37.987951
  WHEN 1038 THEN -37.986575
  WHEN 1039 THEN -37.981018
  WHEN 1040 THEN -37.985799
  WHEN 1041 THEN -37.979203
  WHEN 1042 THEN -37.988026
  WHEN 1043 THEN -38.002910
  WHEN 1044 THEN -37.997897
  WHEN 1045 THEN -37.988562
  WHEN 1046 THEN -37.992437
  WHEN 1047 THEN -37.993932
  WHEN 1048 THEN -37.987059
  WHEN 1049 THEN -37.993524
  WHEN 1050 THEN -38.002128
  WHEN 1051 THEN -37.980300
  WHEN 1052 THEN -37.982186
  WHEN 1053 THEN -37.991531
  WHEN 1054 THEN -37.985821
  WHEN 1055 THEN -37.977474
  WHEN 1056 THEN -37.980896
  WHEN 1057 THEN -38.001788
  WHEN 1058 THEN -38.006084
  WHEN 1059 THEN -37.988909
  WHEN 1060 THEN -37.992744
  WHEN 1061 THEN -37.990266
  WHEN 1062 THEN -37.997002
  WHEN 1063 THEN -38.000609
  WHEN 1064 THEN -37.983320
  WHEN 1065 THEN -38.000761
  WHEN 1066 THEN -37.986567
  WHEN 1067 THEN -37.984302
  WHEN 1068 THEN -37.981338
  WHEN 1069 THEN -37.974779
  WHEN 1070 THEN -37.995387
  WHEN 1071 THEN -37.994911
  WHEN 1072 THEN -37.983917
  WHEN 1073 THEN -37.986012
  WHEN 1074 THEN -37.979255
  WHEN 1075 THEN -37.986454
  WHEN 1076 THEN -37.990196
  WHEN 1077 THEN -37.973868
  WHEN 1078 THEN -37.988434
  WHEN 1079 THEN -37.981211
  WHEN 1080 THEN -37.972723
  WHEN 1081 THEN -37.993479
  WHEN 1082 THEN -37.997300
  WHEN 1083 THEN -37.982782
  WHEN 1084 THEN -37.987551
  WHEN 1085 THEN -37.994743
  WHEN 1086 THEN -37.984563
  WHEN 1087 THEN -38.001801
  WHEN 1088 THEN -37.997219
  WHEN 1089 THEN -37.999329
  WHEN 1090 THEN -37.987911
  WHEN 1091 THEN -37.998054
  WHEN 1092 THEN -38.004078
  WHEN 1093 THEN -37.988711
  WHEN 1094 THEN -37.988420
  WHEN 1095 THEN -37.993446
  WHEN 1096 THEN -37.997129
  WHEN 1097 THEN -37.990969
  WHEN 1098 THEN -37.985533
  WHEN 1099 THEN -37.988595
  WHEN 1100 THEN -37.988985
  WHEN 1101 THEN -37.989124
  WHEN 1102 THEN -37.977959
  WHEN 1103 THEN -37.990603
  WHEN 1104 THEN -37.982166
  WHEN 1105 THEN -37.989377
  WHEN 1106 THEN -38.000785
  WHEN 1107 THEN -37.987774
  WHEN 1108 THEN -37.993029
  WHEN 1109 THEN -37.974447
  WHEN 1110 THEN -37.984435
  WHEN 1111 THEN -37.979645
  WHEN 1112 THEN -37.979659
  WHEN 1113 THEN -37.988131
  WHEN 1114 THEN -37.985166
  WHEN 1115 THEN -37.986831
  WHEN 1116 THEN -37.970961
  WHEN 1117 THEN -37.993804
  WHEN 1118 THEN -37.978747
  WHEN 1119 THEN -37.991786
  WHEN 1120 THEN -37.985248
  WHEN 1121 THEN -37.989914
  WHEN 1122 THEN -37.977011
  WHEN 1123 THEN -37.988662
  WHEN 1124 THEN -37.988543
  WHEN 1125 THEN -37.988399
  WHEN 1126 THEN -37.972944
  WHEN 1127 THEN -37.994281
  WHEN 1128 THEN -37.990326
  WHEN 1129 THEN -37.991281
  WHEN 1130 THEN -37.989441
  WHEN 1131 THEN -37.978238
  WHEN 1132 THEN -37.994052
  WHEN 1133 THEN -37.987770
  WHEN 1134 THEN -37.998492
  WHEN 1135 THEN -37.989708
  WHEN 1136 THEN -37.992473
  WHEN 1137 THEN -37.986680
  WHEN 1138 THEN -37.989328
  WHEN 1139 THEN -37.983519
  WHEN 1140 THEN -37.989979
  WHEN 1141 THEN -37.994896
  WHEN 1142 THEN -37.984217
  WHEN 1143 THEN -37.979549
  WHEN 1144 THEN -37.991505
  WHEN 1145 THEN -37.994121
  WHEN 1146 THEN -37.996441
  WHEN 1147 THEN -37.986000
  WHEN 1148 THEN -37.981367
  WHEN 1149 THEN -37.989697
  WHEN 1150 THEN -37.989136
  WHEN 1151 THEN -37.981558
  WHEN 1152 THEN -37.993946
  WHEN 1153 THEN -37.999084
  WHEN 1154 THEN -37.985405
  WHEN 1155 THEN -37.980238
  WHEN 1156 THEN -37.999357
  WHEN 1157 THEN -37.989227
  WHEN 1158 THEN -37.999150
  WHEN 1159 THEN -37.983593
  WHEN 1160 THEN -37.990560
  WHEN 1161 THEN -37.977546
  WHEN 1162 THEN -37.992611
  WHEN 1163 THEN -37.985077
  WHEN 1164 THEN -38.001670
  WHEN 1165 THEN -37.974720
  WHEN 1166 THEN -37.986376
  WHEN 1167 THEN -37.984655
  WHEN 1168 THEN -37.994433
  WHEN 1169 THEN -37.984504
  WHEN 1170 THEN -37.983207
  WHEN 1171 THEN -37.986455
  WHEN 1172 THEN -37.990586
  WHEN 1173 THEN -37.981412
  WHEN 1174 THEN -37.995386
  WHEN 1175 THEN -37.995173
  WHEN 1176 THEN -37.983046
  WHEN 1177 THEN -38.001133
  WHEN 1178 THEN -37.989728
  WHEN 1179 THEN -37.979863
  WHEN 1180 THEN -37.995015
  WHEN 1181 THEN -38.000894
  WHEN 1182 THEN -37.991239
  WHEN 1183 THEN -37.985672
  WHEN 1184 THEN -37.984638
  WHEN 1185 THEN -37.990183
  WHEN 1186 THEN -37.986012
  WHEN 1187 THEN -37.989157
  WHEN 1188 THEN -37.979827
  WHEN 1189 THEN -37.989321
  WHEN 1190 THEN -37.998604
  WHEN 1191 THEN -37.977945
  WHEN 1192 THEN -38.006106
  WHEN 1193 THEN -37.980995
  WHEN 1194 THEN -37.995831
  WHEN 1195 THEN -37.993290
  WHEN 1196 THEN -37.979619
  WHEN 1197 THEN -37.984240
  WHEN 1198 THEN -37.993695
  WHEN 1199 THEN -37.993456
  WHEN 1200 THEN -37.982263
  WHEN 1201 THEN -37.980023
  WHEN 1202 THEN -37.979827
  WHEN 1203 THEN -37.982913
  WHEN 1204 THEN -37.991168
  WHEN 1205 THEN -37.982567
  WHEN 1206 THEN -37.991832
  WHEN 1207 THEN -37.985900
  WHEN 1208 THEN -37.974625
  WHEN 1209 THEN -37.983369
  WHEN 1210 THEN -37.984326
  WHEN 1211 THEN -37.982783
  WHEN 1212 THEN -37.981505
  WHEN 1213 THEN -37.989829
  WHEN 1214 THEN -37.982983
  WHEN 1215 THEN -37.981139
  WHEN 1216 THEN -37.984430
  WHEN 1217 THEN -37.994354
  WHEN 1218 THEN -37.978141
  WHEN 1219 THEN -37.997245
  WHEN 1220 THEN -37.993113
  WHEN 1221 THEN -37.993927
  WHEN 1222 THEN -37.996950
  WHEN 1223 THEN -37.986847
  WHEN 1224 THEN -37.980643
  WHEN 1225 THEN -37.984049
  WHEN 1226 THEN -37.989180
  WHEN 1227 THEN -37.992400
  WHEN 1228 THEN -37.982710
  WHEN 1229 THEN -37.985041
  WHEN 1230 THEN -37.990344
  WHEN 1231 THEN -37.980274
  WHEN 1232 THEN -37.978368
  WHEN 1233 THEN -37.991859
  WHEN 1234 THEN -37.980402
  WHEN 1235 THEN -37.990174
  WHEN 1236 THEN -37.990661
  WHEN 1237 THEN -37.987128
  WHEN 1238 THEN -37.978305
  WHEN 1239 THEN -37.990044
  WHEN 1240 THEN -37.998016
  WHEN 1241 THEN -37.982868
  WHEN 1242 THEN -37.977461
  WHEN 1243 THEN -37.995819
  WHEN 1244 THEN -37.986306
  WHEN 1245 THEN -37.995055
  WHEN 1246 THEN -37.970828
  WHEN 1247 THEN -37.990966
  WHEN 1248 THEN -37.981784
  WHEN 1249 THEN -37.972708
  WHEN 1250 THEN -37.980439
  WHEN 1251 THEN -37.980410
  WHEN 1252 THEN -37.997451
  WHEN 1253 THEN -37.995118
  WHEN 1254 THEN -37.987074
  WHEN 1255 THEN -37.988069
  WHEN 1256 THEN -37.982031
  WHEN 1257 THEN -37.981113
  WHEN 1258 THEN -37.995454
  WHEN 1259 THEN -37.990444
  WHEN 1260 THEN -37.993674
  WHEN 1261 THEN -37.986391
  WHEN 1262 THEN -37.996226
  WHEN 1263 THEN -37.987329
  WHEN 1264 THEN -37.995433
  WHEN 1265 THEN -37.996634
  WHEN 1266 THEN -37.996372
  WHEN 1267 THEN -37.980263
  WHEN 1268 THEN -37.978269
  WHEN 1269 THEN -37.993926
  WHEN 1270 THEN -37.984575
  WHEN 1271 THEN -37.968447
  WHEN 1272 THEN -37.986286
  WHEN 1273 THEN -37.981803
  WHEN 1274 THEN -37.982889
  WHEN 1275 THEN -37.985911
  WHEN 1276 THEN -37.988577
  WHEN 1277 THEN -37.996742
  WHEN 1278 THEN -37.981968
  WHEN 1279 THEN -37.982980
  WHEN 1280 THEN -37.994065
  WHEN 1281 THEN -37.998367
  WHEN 1282 THEN -37.992883
  WHEN 1283 THEN -37.985103
  WHEN 1284 THEN -37.990239
  WHEN 1285 THEN -37.983122
  WHEN 1286 THEN -37.991967
  WHEN 1287 THEN -37.986846
  WHEN 1288 THEN -38.004293
  WHEN 1289 THEN -37.979096
  WHEN 1290 THEN -37.986532
  WHEN 1291 THEN -37.989774
  WHEN 1292 THEN -37.982032
  WHEN 1293 THEN -38.000442
  WHEN 1294 THEN -37.987780
  WHEN 1295 THEN -37.992716
  WHEN 1296 THEN -37.986188
  WHEN 1297 THEN -37.985384
  WHEN 1298 THEN -37.988284
  WHEN 1299 THEN -37.988687
  WHEN 1300 THEN -37.990347
  WHEN 1301 THEN -37.983982
  WHEN 1302 THEN -37.996336
  WHEN 1303 THEN -37.988891
  WHEN 1304 THEN -37.996306
  WHEN 1305 THEN -37.977597
  WHEN 1306 THEN -37.995947
  WHEN 1307 THEN -37.992422
  WHEN 1308 THEN -37.988716
  WHEN 1309 THEN -37.993817
  WHEN 1310 THEN -37.987139
  WHEN 1311 THEN -38.001609
  WHEN 1312 THEN -38.000937
  WHEN 1313 THEN -37.976924
  WHEN 1314 THEN -37.993857
  WHEN 1315 THEN -37.975907
  WHEN 1316 THEN -37.982071
  WHEN 1317 THEN -37.995242
  WHEN 1318 THEN -37.993013
  WHEN 1319 THEN -37.998169
  WHEN 1320 THEN -37.993439
  WHEN 1321 THEN -37.986972
  WHEN 1322 THEN -37.993396
  WHEN 1323 THEN -37.993536
  WHEN 1324 THEN -37.994400
  WHEN 1325 THEN -37.979962
  WHEN 1326 THEN -37.990302
  WHEN 1327 THEN -38.002250
  WHEN 1328 THEN -38.000500
  WHEN 1329 THEN -37.993705
  WHEN 1330 THEN -37.995840
  WHEN 1331 THEN -37.988224
  WHEN 1332 THEN -37.995592
  WHEN 1333 THEN -37.977446
  WHEN 1334 THEN -37.991387
  WHEN 1335 THEN -37.998122
  WHEN 1336 THEN -37.993411
  WHEN 1337 THEN -37.995704
  WHEN 1338 THEN -38.005390
  WHEN 1339 THEN -37.984417
  WHEN 1340 THEN -37.996853
  WHEN 1341 THEN -38.005545
  WHEN 1342 THEN -38.001892
  WHEN 1343 THEN -37.996395
  WHEN 1344 THEN -37.989186
  WHEN 1345 THEN -37.988887
  WHEN 1346 THEN -37.968481
  WHEN 1347 THEN -38.000978
  WHEN 1348 THEN -37.979296
  WHEN 1349 THEN -37.994512
  WHEN 1350 THEN -37.991150
  WHEN 1351 THEN -37.979299
  WHEN 1352 THEN -37.993090
  WHEN 1353 THEN -37.986406
  WHEN 1354 THEN -37.987971
  WHEN 1355 THEN -37.982858
  WHEN 1356 THEN -37.976939
  WHEN 1357 THEN -37.977640
  WHEN 1358 THEN -37.988846
  WHEN 1359 THEN -37.990173
  WHEN 1360 THEN -37.985539
  WHEN 1361 THEN -37.989509
  WHEN 1362 THEN -37.995750
  WHEN 1363 THEN -37.998057
  WHEN 1364 THEN -37.981684
  WHEN 1365 THEN -37.994614
  WHEN 1366 THEN -37.987230
  WHEN 1367 THEN -37.983054
  WHEN 1368 THEN -37.988981
  WHEN 1369 THEN -37.987419
  WHEN 1370 THEN -37.987559
  WHEN 1371 THEN -37.997647
  WHEN 1372 THEN -37.979184
  WHEN 1373 THEN -37.990682
  WHEN 1374 THEN -37.995298
  WHEN 1375 THEN -37.984861
  WHEN 1376 THEN -37.988271
  WHEN 1377 THEN -37.981271
  WHEN 1378 THEN -37.993779
  WHEN 1379 THEN -38.001608
  WHEN 1380 THEN -37.996888
  WHEN 1381 THEN -37.987763
  WHEN 1382 THEN -37.988968
  WHEN 1383 THEN -37.976970
  WHEN 1384 THEN -37.983865
  WHEN 1385 THEN -37.991596
  WHEN 1386 THEN -37.981485
  WHEN 1387 THEN -37.989215
  WHEN 1388 THEN -37.988750
  WHEN 1389 THEN -37.981053
  WHEN 1390 THEN -37.999800
  WHEN 1391 THEN -37.982057
  WHEN 1392 THEN -37.998775
  WHEN 1393 THEN -37.997381
  WHEN 1394 THEN -37.973702
  WHEN 1395 THEN -38.000760
  WHEN 1396 THEN -37.979479
  WHEN 1397 THEN -37.970862
  WHEN 1398 THEN -37.985620
  WHEN 1399 THEN -37.997228
  WHEN 1400 THEN -38.002180
  WHEN 1401 THEN -37.991377
  WHEN 1402 THEN -37.988919
  WHEN 1403 THEN -38.005395
  WHEN 1404 THEN -37.991747
  WHEN 1405 THEN -37.999473
  WHEN 1406 THEN -37.989378
  WHEN 1407 THEN -37.986954
  WHEN 1408 THEN -37.978468
  WHEN 1409 THEN -37.982578
  WHEN 1410 THEN -37.999005
  WHEN 1411 THEN -37.983903
  WHEN 1412 THEN -37.994089
  WHEN 1413 THEN -37.994452
  WHEN 1414 THEN -37.995176
  WHEN 1415 THEN -37.986472
  WHEN 1416 THEN -37.979423
  WHEN 1417 THEN -37.978011
  WHEN 1418 THEN -37.985004
  WHEN 1419 THEN -37.998695
  WHEN 1420 THEN -37.980761
  WHEN 1421 THEN -37.996872
  WHEN 1422 THEN -37.979411
  WHEN 1423 THEN -37.973371
  WHEN 1424 THEN -37.981709
  WHEN 1425 THEN -37.990054
  WHEN 1426 THEN -37.986898
  WHEN 1427 THEN -37.981185
  WHEN 1428 THEN -37.979063
  WHEN 1429 THEN -37.993395
  WHEN 1430 THEN -37.984375
  WHEN 1431 THEN -37.984431
  WHEN 1432 THEN -37.995242
  WHEN 1433 THEN -37.994119
  WHEN 1434 THEN -37.987426
  WHEN 1435 THEN -37.984886
  WHEN 1436 THEN -37.981332
  WHEN 1437 THEN -37.999790
  WHEN 1438 THEN -37.978066
  WHEN 1439 THEN -37.981665
  WHEN 1440 THEN -37.977739
  WHEN 1441 THEN -37.988395
  WHEN 1442 THEN -37.974624
  WHEN 1443 THEN -37.989616
  WHEN 1444 THEN -37.983615
  WHEN 1445 THEN -37.985536
  WHEN 1446 THEN -37.989747
  WHEN 1447 THEN -37.990542
  WHEN 1448 THEN -37.998523
  WHEN 1449 THEN -37.999494
  WHEN 1450 THEN -37.978702
  WHEN 1451 THEN -37.993315
  WHEN 1452 THEN -37.988837
  WHEN 1453 THEN -37.985949
  WHEN 1454 THEN -38.002413
  WHEN 1455 THEN -37.992648
  WHEN 1456 THEN -37.983589
  WHEN 1457 THEN -37.984427
  WHEN 1458 THEN -37.987636
  WHEN 1459 THEN -37.984372
  WHEN 1460 THEN -37.980011
  WHEN 1461 THEN -37.980410
  WHEN 1462 THEN -37.982922
  WHEN 1463 THEN -37.994262
  WHEN 1464 THEN -37.995865
  WHEN 1465 THEN -37.985317
  WHEN 1466 THEN -37.999606
  WHEN 1467 THEN -37.994714
  WHEN 1468 THEN -37.987015
  WHEN 1469 THEN -37.990383
  WHEN 1470 THEN -37.998243
  WHEN 1471 THEN -37.989973
  WHEN 1472 THEN -37.995828
  WHEN 1473 THEN -37.987921
  WHEN 1474 THEN -37.991622
  WHEN 1475 THEN -37.984860
  WHEN 1476 THEN -37.977113
  WHEN 1477 THEN -37.991848
  WHEN 1478 THEN -38.003300
  WHEN 1479 THEN -37.978548
  WHEN 1480 THEN -38.004868
  WHEN 1481 THEN -37.981023
  WHEN 1482 THEN -37.984253
  WHEN 1483 THEN -38.001561
  WHEN 1484 THEN -37.985974
  WHEN 1485 THEN -37.989964
  WHEN 1486 THEN -37.985007
  WHEN 1487 THEN -37.975359
  WHEN 1488 THEN -37.982539
  WHEN 1489 THEN -37.990471
  WHEN 1490 THEN -37.977763
  WHEN 1491 THEN -38.000950
  WHEN 1492 THEN -37.987259
  WHEN 1493 THEN -37.991321
  WHEN 1494 THEN -37.985978
  WHEN 1495 THEN -37.983785
  WHEN 1496 THEN -37.982108
  WHEN 1497 THEN -37.990647
  WHEN 1498 THEN -37.993418
  WHEN 1499 THEN -37.989956
  WHEN 1500 THEN -37.989553
  WHEN 1501 THEN -37.975275
  WHEN 1502 THEN -38.005008
  WHEN 1503 THEN -37.980715
  WHEN 1504 THEN -37.993873
  WHEN 1505 THEN -37.989427
  WHEN 1506 THEN -37.991413
  WHEN 1507 THEN -37.992347
  WHEN 1508 THEN -37.973672
  WHEN 1509 THEN -37.990401
  WHEN 1510 THEN -37.988488
  WHEN 1511 THEN -37.999150
  WHEN 1512 THEN -37.983417
  WHEN 1513 THEN -37.987268
  WHEN 1514 THEN -37.985699
  WHEN 1515 THEN -37.994185
  WHEN 1516 THEN -37.978029
  WHEN 1517 THEN -37.999799
  WHEN 1518 THEN -37.987172
  WHEN 1519 THEN -37.984366
  WHEN 1520 THEN -37.978539
  WHEN 1521 THEN -37.990169
  WHEN 1522 THEN -37.983097
  WHEN 1523 THEN -37.999441
  WHEN 1524 THEN -37.997431
  WHEN 1525 THEN -37.991936
  WHEN 1526 THEN -37.998688
  WHEN 1527 THEN -37.998902
  WHEN 1528 THEN -37.977977
  WHEN 1529 THEN -37.993101
  WHEN 1530 THEN -37.982514
  WHEN 1531 THEN -38.002654
  WHEN 1532 THEN -37.971229
  WHEN 1533 THEN -37.977736
  WHEN 1534 THEN -38.004671
  WHEN 1535 THEN -37.982450
  WHEN 1536 THEN -37.989417
  WHEN 1537 THEN -37.987259
  WHEN 1538 THEN -37.994286
  WHEN 1539 THEN -37.982695
  WHEN 1540 THEN -37.991844
  WHEN 1541 THEN -37.977910
  WHEN 1542 THEN -37.998904
  WHEN 1543 THEN -37.996120
  WHEN 1544 THEN -37.980004
  WHEN 1545 THEN -37.990426
  WHEN 1546 THEN -37.997242
  WHEN 1547 THEN -37.992607
  WHEN 1548 THEN -37.992762
  WHEN 1549 THEN -37.986574
  WHEN 1550 THEN -37.984961
  WHEN 1551 THEN -37.986856
  WHEN 1552 THEN -37.984688
  WHEN 1553 THEN -37.984116
  WHEN 1554 THEN -37.993260
  WHEN 1555 THEN -37.997705
  WHEN 1556 THEN -37.981557
  WHEN 1557 THEN -37.993520
  WHEN 1558 THEN -37.993129
  WHEN 1559 THEN -37.975162
  WHEN 1560 THEN -37.996875
  WHEN 1561 THEN -37.980515
  WHEN 1562 THEN -37.991336
  WHEN 1563 THEN -37.984771
  WHEN 1564 THEN -38.005658
  WHEN 1565 THEN -37.984554
  WHEN 1566 THEN -37.992121
  WHEN 1567 THEN -37.983493
  WHEN 1568 THEN -37.987804
  WHEN 1569 THEN -37.999820
  WHEN 1570 THEN -37.985042
  WHEN 1571 THEN -37.972791
  WHEN 1572 THEN -37.996807
  WHEN 1573 THEN -37.990565
  WHEN 1574 THEN -37.979291
  WHEN 1575 THEN -37.999514
  WHEN 1576 THEN -37.993392
  WHEN 1577 THEN -37.981821
  WHEN 1578 THEN -37.981339
  WHEN 1579 THEN -37.985102
  WHEN 1580 THEN -37.998527
  WHEN 1581 THEN -37.992418
  WHEN 1582 THEN -37.983699
  WHEN 1583 THEN -37.995057
  WHEN 1584 THEN -37.988707
  WHEN 1585 THEN -37.989044
  WHEN 1586 THEN -37.986900
  WHEN 1587 THEN -37.985809
  WHEN 1588 THEN -37.990651
  WHEN 1589 THEN -37.999980
  WHEN 1590 THEN -37.989608
  WHEN 1591 THEN -37.985425
  WHEN 1592 THEN -37.980004
  WHEN 1593 THEN -37.994165
  WHEN 1594 THEN -37.996769
  WHEN 1595 THEN -37.987138
  WHEN 1596 THEN -37.979810
  WHEN 1597 THEN -37.993107
  WHEN 1598 THEN -37.996817
  WHEN 1599 THEN -37.990509
  WHEN 1600 THEN -37.992076
  WHEN 1601 THEN -37.995122
  WHEN 1602 THEN -37.987369
  WHEN 1603 THEN -37.984726
  WHEN 1604 THEN -37.988581
  WHEN 1605 THEN -37.990552
  WHEN 1606 THEN -38.006319
  WHEN 1607 THEN -37.995294
  WHEN 1608 THEN -37.991448
  WHEN 1609 THEN -38.004833
  WHEN 1610 THEN -37.993195
  WHEN 1611 THEN -37.998452
  WHEN 1612 THEN -38.002284
  WHEN 1613 THEN -37.987431
  WHEN 1614 THEN -38.000562
  WHEN 1615 THEN -37.997943
  WHEN 1616 THEN -37.991371
  WHEN 1617 THEN -37.995767
  WHEN 1618 THEN -37.993387
  WHEN 1619 THEN -37.987383
  WHEN 1620 THEN -37.985502
  WHEN 1621 THEN -37.988217
  WHEN 1622 THEN -37.978289
  WHEN 1623 THEN -37.973733
  WHEN 1624 THEN -38.003182
  WHEN 1625 THEN -37.982455
  WHEN 1626 THEN -37.972038
  WHEN 1627 THEN -37.988079
  WHEN 1628 THEN -37.986353
  WHEN 1629 THEN -37.983040
  WHEN 1630 THEN -37.992350
  WHEN 1631 THEN -37.982732
  WHEN 1632 THEN -37.995348
  WHEN 1633 THEN -37.988503
  WHEN 1634 THEN -37.998229
  WHEN 1635 THEN -37.982549
  WHEN 1636 THEN -37.990071
  WHEN 1637 THEN -37.985299
  WHEN 1638 THEN -37.987338
  WHEN 1639 THEN -37.993860
  WHEN 1640 THEN -37.991623
  WHEN 1641 THEN -37.990664
  WHEN 1642 THEN -37.984133
  WHEN 1643 THEN -37.986336
  WHEN 1644 THEN -37.990284
  WHEN 1645 THEN -37.993752
  WHEN 1646 THEN -37.988814
  WHEN 1647 THEN -37.973398
  WHEN 1648 THEN -37.981469
  WHEN 1649 THEN -37.991165
  WHEN 1650 THEN -37.983257
  WHEN 1651 THEN -37.996263
  WHEN 1652 THEN -37.993318
  WHEN 1653 THEN -37.978331
  WHEN 1654 THEN -37.988043
  WHEN 1655 THEN -37.983470
  WHEN 1656 THEN -37.981917
  WHEN 1657 THEN -37.984763
  WHEN 1658 THEN -37.979114
  WHEN 1659 THEN -37.986018
  WHEN 1660 THEN -37.990760
  WHEN 1661 THEN -37.988283
  WHEN 1662 THEN -37.991193
  WHEN 1663 THEN -37.998141
  WHEN 1664 THEN -37.984423
  WHEN 1665 THEN -37.987522
  WHEN 1666 THEN -37.975749
  WHEN 1667 THEN -38.000405
  WHEN 1668 THEN -37.995399
  WHEN 1669 THEN -37.983430
  WHEN 1670 THEN -37.978890
  WHEN 1671 THEN -37.990304
  WHEN 1672 THEN -37.993459
  WHEN 1673 THEN -37.995888
  WHEN 1674 THEN -37.987048
  WHEN 1675 THEN -37.974378
  WHEN 1676 THEN -37.984087
  WHEN 1677 THEN -37.982159
  WHEN 1678 THEN -37.990021
  WHEN 1679 THEN -37.990713
  WHEN 1680 THEN -37.975028
  WHEN 1681 THEN -37.986689
  WHEN 1682 THEN -38.002628
  WHEN 1683 THEN -37.973239
  WHEN 1684 THEN -37.988050
  WHEN 1685 THEN -37.988419
  WHEN 1686 THEN -37.998244
  WHEN 1687 THEN -37.997157
  WHEN 1688 THEN -37.984062
  WHEN 1689 THEN -37.998570
  WHEN 1690 THEN -37.983472
  WHEN 1691 THEN -37.977403
  WHEN 1692 THEN -37.997653
  WHEN 1693 THEN -37.988621
  WHEN 1694 THEN -37.988415
  WHEN 1695 THEN -37.997275
  WHEN 1696 THEN -37.979774
  WHEN 1697 THEN -37.982076
  WHEN 1698 THEN -37.989244
  WHEN 1699 THEN -37.978065
  WHEN 1700 THEN -37.987863
  WHEN 1701 THEN -38.000392
  WHEN 1702 THEN -37.995365
  WHEN 1703 THEN -37.993983
  WHEN 1704 THEN -37.981703
  WHEN 1705 THEN -37.980002
  WHEN 1706 THEN -37.992232
  WHEN 1707 THEN -37.989081
  WHEN 1708 THEN -38.003256
  WHEN 1709 THEN -37.977762
  WHEN 1710 THEN -37.981069
  WHEN 1711 THEN -37.988523
  WHEN 1712 THEN -37.995981
  WHEN 1713 THEN -37.997162
  WHEN 1714 THEN -37.985996
  WHEN 1715 THEN -37.991825
  WHEN 1716 THEN -37.982688
  WHEN 1717 THEN -38.001844
  WHEN 1718 THEN -37.972564
  WHEN 1719 THEN -37.989387
  WHEN 1720 THEN -37.974730
  WHEN 1721 THEN -38.000706
  WHEN 1722 THEN -37.994136
  WHEN 1723 THEN -37.984750
  WHEN 1724 THEN -37.989061
  WHEN 1725 THEN -37.991108
  WHEN 1726 THEN -37.974861
  WHEN 1727 THEN -37.994127
  WHEN 1728 THEN -37.998288
  WHEN 1729 THEN -37.991842
  WHEN 1730 THEN -37.970103
  WHEN 1731 THEN -37.984149
  WHEN 1732 THEN -37.991759
  WHEN 1733 THEN -37.993083
  WHEN 1734 THEN -37.976374
  WHEN 1735 THEN -37.987444
  WHEN 1736 THEN -37.984310
  WHEN 1737 THEN -37.987734
  WHEN 1738 THEN -37.985759
  WHEN 1739 THEN -37.991421
  WHEN 1740 THEN -37.981899
  WHEN 1741 THEN -37.983608
  WHEN 1742 THEN -37.988164
  WHEN 1743 THEN -37.987568
  WHEN 1744 THEN -37.990262
  WHEN 1745 THEN -37.990470
  WHEN 1746 THEN -37.994756
  WHEN 1747 THEN -37.991639
  WHEN 1748 THEN -37.997126
  WHEN 1749 THEN -37.984651
  WHEN 1750 THEN -37.987306
  WHEN 1751 THEN -37.976347
  WHEN 1752 THEN -37.987910
  WHEN 1753 THEN -37.999269
  WHEN 1754 THEN -37.984268
  WHEN 1755 THEN -37.997542
  WHEN 1756 THEN -37.991126
  WHEN 1757 THEN -37.978330
  WHEN 1758 THEN -37.977814
  WHEN 1759 THEN -37.987633
  WHEN 1760 THEN -37.982636
  WHEN 1761 THEN -37.993785
  WHEN 1762 THEN -37.981819
  WHEN 1763 THEN -37.994128
  WHEN 1764 THEN -37.992354
  WHEN 1765 THEN -37.970164
  WHEN 1766 THEN -38.003780
  WHEN 1767 THEN -37.995480
  WHEN 1768 THEN -37.984088
  WHEN 1769 THEN -37.976733
  WHEN 1770 THEN -37.995472
  WHEN 1771 THEN -37.989904
  WHEN 1772 THEN -37.991114
  WHEN 1773 THEN -37.997290
  WHEN 1774 THEN -37.985768
  WHEN 1775 THEN -37.986030
  WHEN 1776 THEN -37.977095
  WHEN 1777 THEN -37.995632
  WHEN 1778 THEN -37.996589
  WHEN 1779 THEN -37.983122
  WHEN 1780 THEN -37.989755
  WHEN 1781 THEN -37.989228
  WHEN 1782 THEN -38.001352
  WHEN 1783 THEN -37.986257
  WHEN 1784 THEN -37.980601
  WHEN 1785 THEN -37.978930
  WHEN 1786 THEN -37.974600
  WHEN 1787 THEN -37.982615
  WHEN 1788 THEN -37.997811
  WHEN 1789 THEN -37.990770
  WHEN 1790 THEN -37.979066
  WHEN 1791 THEN -37.989095
  WHEN 1792 THEN -37.996898
  WHEN 1793 THEN -37.982836
  WHEN 1794 THEN -37.988853
  WHEN 1795 THEN -37.975449
  WHEN 1796 THEN -37.979306
  WHEN 1797 THEN -37.993203
  WHEN 1798 THEN -37.977312
  ELSE -37.9989
END),
  (CASE gs
  WHEN 1 THEN -61.339763
  WHEN 2 THEN -61.356961
  WHEN 3 THEN -61.349745
  WHEN 4 THEN -61.354023
  WHEN 5 THEN -61.342976
  WHEN 6 THEN -61.334232
  WHEN 7 THEN -61.343513
  WHEN 8 THEN -61.341340
  WHEN 9 THEN -61.356325
  WHEN 10 THEN -61.337043
  WHEN 11 THEN -61.351236
  WHEN 12 THEN -61.349032
  WHEN 13 THEN -61.348160
  WHEN 14 THEN -61.360492
  WHEN 15 THEN -61.349472
  WHEN 16 THEN -61.337335
  WHEN 17 THEN -61.361358
  WHEN 18 THEN -61.339751
  WHEN 19 THEN -61.353204
  WHEN 20 THEN -61.353867
  WHEN 21 THEN -61.340005
  WHEN 22 THEN -61.351005
  WHEN 23 THEN -61.337108
  WHEN 24 THEN -61.363419
  WHEN 25 THEN -61.345845
  WHEN 26 THEN -61.337480
  WHEN 27 THEN -61.352185
  WHEN 28 THEN -61.350030
  WHEN 29 THEN -61.361232
  WHEN 30 THEN -61.354504
  WHEN 31 THEN -61.351124
  WHEN 32 THEN -61.359590
  WHEN 33 THEN -61.358594
  WHEN 34 THEN -61.353006
  WHEN 35 THEN -61.355285
  WHEN 36 THEN -61.340673
  WHEN 37 THEN -61.360566
  WHEN 38 THEN -61.353014
  WHEN 39 THEN -61.335656
  WHEN 40 THEN -61.348998
  WHEN 41 THEN -61.334365
  WHEN 42 THEN -61.353084
  WHEN 43 THEN -61.346365
  WHEN 44 THEN -61.352814
  WHEN 45 THEN -61.340538
  WHEN 46 THEN -61.344402
  WHEN 47 THEN -61.345728
  WHEN 48 THEN -61.355270
  WHEN 49 THEN -61.346119
  WHEN 50 THEN -61.345012
  WHEN 51 THEN -61.356766
  WHEN 52 THEN -61.337741
  WHEN 53 THEN -61.344752
  WHEN 54 THEN -61.337482
  WHEN 55 THEN -61.354845
  WHEN 56 THEN -61.337297
  WHEN 57 THEN -61.335915
  WHEN 58 THEN -61.345677
  WHEN 59 THEN -61.338635
  WHEN 60 THEN -61.348145
  WHEN 61 THEN -61.353983
  WHEN 62 THEN -61.339498
  WHEN 63 THEN -61.352004
  WHEN 64 THEN -61.341872
  WHEN 65 THEN -61.351149
  WHEN 66 THEN -61.332388
  WHEN 67 THEN -61.344428
  WHEN 68 THEN -61.339707
  WHEN 69 THEN -61.355760
  WHEN 70 THEN -61.350478
  WHEN 71 THEN -61.347243
  WHEN 72 THEN -61.347995
  WHEN 73 THEN -61.340289
  WHEN 74 THEN -61.350079
  WHEN 75 THEN -61.338691
  WHEN 76 THEN -61.343106
  WHEN 77 THEN -61.346201
  WHEN 78 THEN -61.344240
  WHEN 79 THEN -61.352014
  WHEN 80 THEN -61.338824
  WHEN 81 THEN -61.357071
  WHEN 82 THEN -61.351536
  WHEN 83 THEN -61.342013
  WHEN 84 THEN -61.345618
  WHEN 85 THEN -61.346264
  WHEN 86 THEN -61.350525
  WHEN 87 THEN -61.352044
  WHEN 88 THEN -61.351557
  WHEN 89 THEN -61.338733
  WHEN 90 THEN -61.353624
  WHEN 91 THEN -61.349412
  WHEN 92 THEN -61.351001
  WHEN 93 THEN -61.337624
  WHEN 94 THEN -61.348737
  WHEN 95 THEN -61.345206
  WHEN 96 THEN -61.360456
  WHEN 97 THEN -61.345198
  WHEN 98 THEN -61.345856
  WHEN 99 THEN -61.339587
  WHEN 100 THEN -61.344579
  WHEN 101 THEN -61.349153
  WHEN 102 THEN -61.349529
  WHEN 103 THEN -61.346736
  WHEN 104 THEN -61.348187
  WHEN 105 THEN -61.339887
  WHEN 106 THEN -61.348117
  WHEN 107 THEN -61.343858
  WHEN 108 THEN -61.361370
  WHEN 109 THEN -61.342369
  WHEN 110 THEN -61.355279
  WHEN 111 THEN -61.346086
  WHEN 112 THEN -61.348942
  WHEN 113 THEN -61.356849
  WHEN 114 THEN -61.362443
  WHEN 115 THEN -61.344820
  WHEN 116 THEN -61.341416
  WHEN 117 THEN -61.350357
  WHEN 118 THEN -61.334954
  WHEN 119 THEN -61.348405
  WHEN 120 THEN -61.347690
  WHEN 121 THEN -61.338466
  WHEN 122 THEN -61.349664
  WHEN 123 THEN -61.345006
  WHEN 124 THEN -61.356874
  WHEN 125 THEN -61.344858
  WHEN 126 THEN -61.354392
  WHEN 127 THEN -61.343917
  WHEN 128 THEN -61.355073
  WHEN 129 THEN -61.343699
  WHEN 130 THEN -61.358838
  WHEN 131 THEN -61.337260
  WHEN 132 THEN -61.339239
  WHEN 133 THEN -61.345318
  WHEN 134 THEN -61.343582
  WHEN 135 THEN -61.346464
  WHEN 136 THEN -61.355983
  WHEN 137 THEN -61.344493
  WHEN 138 THEN -61.351232
  WHEN 139 THEN -61.345640
  WHEN 140 THEN -61.363134
  WHEN 141 THEN -61.354307
  WHEN 142 THEN -61.348374
  WHEN 143 THEN -61.352489
  WHEN 144 THEN -61.349612
  WHEN 145 THEN -61.352229
  WHEN 146 THEN -61.360046
  WHEN 147 THEN -61.348880
  WHEN 148 THEN -61.346821
  WHEN 149 THEN -61.339117
  WHEN 150 THEN -61.341486
  WHEN 151 THEN -61.341912
  WHEN 152 THEN -61.358403
  WHEN 153 THEN -61.353971
  WHEN 154 THEN -61.350222
  WHEN 155 THEN -61.360413
  WHEN 156 THEN -61.345031
  WHEN 157 THEN -61.349584
  WHEN 158 THEN -61.351076
  WHEN 159 THEN -61.345520
  WHEN 160 THEN -61.345647
  WHEN 161 THEN -61.355068
  WHEN 162 THEN -61.353655
  WHEN 163 THEN -61.361117
  WHEN 164 THEN -61.355293
  WHEN 165 THEN -61.354107
  WHEN 166 THEN -61.345027
  WHEN 167 THEN -61.340662
  WHEN 168 THEN -61.343723
  WHEN 169 THEN -61.357102
  WHEN 170 THEN -61.339814
  WHEN 171 THEN -61.342523
  WHEN 172 THEN -61.365269
  WHEN 173 THEN -61.347910
  WHEN 174 THEN -61.347423
  WHEN 175 THEN -61.346021
  WHEN 176 THEN -61.354783
  WHEN 177 THEN -61.335824
  WHEN 178 THEN -61.348112
  WHEN 179 THEN -61.335569
  WHEN 180 THEN -61.355712
  WHEN 181 THEN -61.353717
  WHEN 182 THEN -61.329921
  WHEN 183 THEN -61.357507
  WHEN 184 THEN -61.361954
  WHEN 185 THEN -61.339272
  WHEN 186 THEN -61.351008
  WHEN 187 THEN -61.343139
  WHEN 188 THEN -61.341137
  WHEN 189 THEN -61.345733
  WHEN 190 THEN -61.357155
  WHEN 191 THEN -61.355557
  WHEN 192 THEN -61.352589
  WHEN 193 THEN -61.351763
  WHEN 194 THEN -61.346593
  WHEN 195 THEN -61.351996
  WHEN 196 THEN -61.334048
  WHEN 197 THEN -61.338332
  WHEN 198 THEN -61.349828
  WHEN 199 THEN -61.346398
  WHEN 200 THEN -61.334277
  WHEN 201 THEN -61.354275
  WHEN 202 THEN -61.341667
  WHEN 203 THEN -61.341288
  WHEN 204 THEN -61.346347
  WHEN 205 THEN -61.350206
  WHEN 206 THEN -61.342926
  WHEN 207 THEN -61.353638
  WHEN 208 THEN -61.333449
  WHEN 209 THEN -61.335223
  WHEN 210 THEN -61.348752
  WHEN 211 THEN -61.349430
  WHEN 212 THEN -61.363803
  WHEN 213 THEN -61.339075
  WHEN 214 THEN -61.344097
  WHEN 215 THEN -61.337816
  WHEN 216 THEN -61.334477
  WHEN 217 THEN -61.343118
  WHEN 218 THEN -61.354823
  WHEN 219 THEN -61.347686
  WHEN 220 THEN -61.362758
  WHEN 221 THEN -61.338776
  WHEN 222 THEN -61.345042
  WHEN 223 THEN -61.340727
  WHEN 224 THEN -61.357343
  WHEN 225 THEN -61.344122
  WHEN 226 THEN -61.333880
  WHEN 227 THEN -61.343666
  WHEN 228 THEN -61.339191
  WHEN 229 THEN -61.341530
  WHEN 230 THEN -61.353590
  WHEN 231 THEN -61.345154
  WHEN 232 THEN -61.353485
  WHEN 233 THEN -61.348864
  WHEN 234 THEN -61.351707
  WHEN 235 THEN -61.358870
  WHEN 236 THEN -61.342892
  WHEN 237 THEN -61.351595
  WHEN 238 THEN -61.356177
  WHEN 239 THEN -61.355078
  WHEN 240 THEN -61.353867
  WHEN 241 THEN -61.345586
  WHEN 242 THEN -61.349292
  WHEN 243 THEN -61.364147
  WHEN 244 THEN -61.345885
  WHEN 245 THEN -61.343527
  WHEN 246 THEN -61.345943
  WHEN 247 THEN -61.353271
  WHEN 248 THEN -61.354285
  WHEN 249 THEN -61.343827
  WHEN 250 THEN -61.352418
  WHEN 251 THEN -61.345692
  WHEN 252 THEN -61.351299
  WHEN 253 THEN -61.357067
  WHEN 254 THEN -61.352046
  WHEN 255 THEN -61.348672
  WHEN 256 THEN -61.342415
  WHEN 257 THEN -61.354584
  WHEN 258 THEN -61.345063
  WHEN 259 THEN -61.341818
  WHEN 260 THEN -61.349126
  WHEN 261 THEN -61.354777
  WHEN 262 THEN -61.359497
  WHEN 263 THEN -61.351219
  WHEN 264 THEN -61.340626
  WHEN 265 THEN -61.351172
  WHEN 266 THEN -61.356822
  WHEN 267 THEN -61.352667
  WHEN 268 THEN -61.331468
  WHEN 269 THEN -61.333359
  WHEN 270 THEN -61.329077
  WHEN 271 THEN -61.355632
  WHEN 272 THEN -61.346809
  WHEN 273 THEN -61.345007
  WHEN 274 THEN -61.349318
  WHEN 275 THEN -61.348535
  WHEN 276 THEN -61.360847
  WHEN 277 THEN -61.339969
  WHEN 278 THEN -61.365931
  WHEN 279 THEN -61.342085
  WHEN 280 THEN -61.339889
  WHEN 281 THEN -61.356060
  WHEN 282 THEN -61.357148
  WHEN 283 THEN -61.350873
  WHEN 284 THEN -61.343058
  WHEN 285 THEN -61.345575
  WHEN 286 THEN -61.335736
  WHEN 287 THEN -61.343531
  WHEN 288 THEN -61.345446
  WHEN 289 THEN -61.349725
  WHEN 290 THEN -61.348655
  WHEN 291 THEN -61.339213
  WHEN 292 THEN -61.349550
  WHEN 293 THEN -61.351528
  WHEN 294 THEN -61.344301
  WHEN 295 THEN -61.338097
  WHEN 296 THEN -61.337786
  WHEN 297 THEN -61.346185
  WHEN 298 THEN -61.340020
  WHEN 299 THEN -61.344636
  WHEN 300 THEN -61.332319
  WHEN 301 THEN -61.354557
  WHEN 302 THEN -61.354513
  WHEN 303 THEN -61.347571
  WHEN 304 THEN -61.346314
  WHEN 305 THEN -61.353269
  WHEN 306 THEN -61.348635
  WHEN 307 THEN -61.338456
  WHEN 308 THEN -61.352606
  WHEN 309 THEN -61.353588
  WHEN 310 THEN -61.337110
  WHEN 311 THEN -61.352911
  WHEN 312 THEN -61.347467
  WHEN 313 THEN -61.338840
  WHEN 314 THEN -61.347006
  WHEN 315 THEN -61.343899
  WHEN 316 THEN -61.339246
  WHEN 317 THEN -61.354890
  WHEN 318 THEN -61.342457
  WHEN 319 THEN -61.337007
  WHEN 320 THEN -61.339493
  WHEN 321 THEN -61.354575
  WHEN 322 THEN -61.342859
  WHEN 323 THEN -61.343560
  WHEN 324 THEN -61.345795
  WHEN 325 THEN -61.358387
  WHEN 326 THEN -61.345450
  WHEN 327 THEN -61.344565
  WHEN 328 THEN -61.339305
  WHEN 329 THEN -61.339675
  WHEN 330 THEN -61.353479
  WHEN 331 THEN -61.344441
  WHEN 332 THEN -61.351617
  WHEN 333 THEN -61.345661
  WHEN 334 THEN -61.346277
  WHEN 335 THEN -61.351002
  WHEN 336 THEN -61.345666
  WHEN 337 THEN -61.339678
  WHEN 338 THEN -61.346625
  WHEN 339 THEN -61.349708
  WHEN 340 THEN -61.342600
  WHEN 341 THEN -61.358283
  WHEN 342 THEN -61.365467
  WHEN 343 THEN -61.343017
  WHEN 344 THEN -61.345319
  WHEN 345 THEN -61.350849
  WHEN 346 THEN -61.349625
  WHEN 347 THEN -61.337780
  WHEN 348 THEN -61.346700
  WHEN 349 THEN -61.346786
  WHEN 350 THEN -61.365881
  WHEN 351 THEN -61.351947
  WHEN 352 THEN -61.350523
  WHEN 353 THEN -61.349676
  WHEN 354 THEN -61.348553
  WHEN 355 THEN -61.358681
  WHEN 356 THEN -61.354748
  WHEN 357 THEN -61.350006
  WHEN 358 THEN -61.337184
  WHEN 359 THEN -61.348695
  WHEN 360 THEN -61.336753
  WHEN 361 THEN -61.341451
  WHEN 362 THEN -61.346726
  WHEN 363 THEN -61.351678
  WHEN 364 THEN -61.347414
  WHEN 365 THEN -61.342794
  WHEN 366 THEN -61.347303
  WHEN 367 THEN -61.343410
  WHEN 368 THEN -61.346303
  WHEN 369 THEN -61.348053
  WHEN 370 THEN -61.346044
  WHEN 371 THEN -61.336519
  WHEN 372 THEN -61.348242
  WHEN 373 THEN -61.336115
  WHEN 374 THEN -61.359275
  WHEN 375 THEN -61.353680
  WHEN 376 THEN -61.356969
  WHEN 377 THEN -61.346913
  WHEN 378 THEN -61.353887
  WHEN 379 THEN -61.336913
  WHEN 380 THEN -61.357391
  WHEN 381 THEN -61.337075
  WHEN 382 THEN -61.350523
  WHEN 383 THEN -61.351384
  WHEN 384 THEN -61.347439
  WHEN 385 THEN -61.349120
  WHEN 386 THEN -61.352411
  WHEN 387 THEN -61.351755
  WHEN 388 THEN -61.340243
  WHEN 389 THEN -61.358739
  WHEN 390 THEN -61.347599
  WHEN 391 THEN -61.348214
  WHEN 392 THEN -61.349344
  WHEN 393 THEN -61.347387
  WHEN 394 THEN -61.346531
  WHEN 395 THEN -61.355861
  WHEN 396 THEN -61.349370
  WHEN 397 THEN -61.339982
  WHEN 398 THEN -61.354687
  WHEN 399 THEN -61.347023
  WHEN 400 THEN -61.344819
  WHEN 401 THEN -61.342409
  WHEN 402 THEN -61.338952
  WHEN 403 THEN -61.342298
  WHEN 404 THEN -61.341336
  WHEN 405 THEN -61.358883
  WHEN 406 THEN -61.335030
  WHEN 407 THEN -61.353566
  WHEN 408 THEN -61.344881
  WHEN 409 THEN -61.339334
  WHEN 410 THEN -61.347481
  WHEN 411 THEN -61.344267
  WHEN 412 THEN -61.348630
  WHEN 413 THEN -61.355856
  WHEN 414 THEN -61.357380
  WHEN 415 THEN -61.346947
  WHEN 416 THEN -61.351395
  WHEN 417 THEN -61.346735
  WHEN 418 THEN -61.340566
  WHEN 419 THEN -61.363013
  WHEN 420 THEN -61.352070
  WHEN 421 THEN -61.333959
  WHEN 422 THEN -61.347529
  WHEN 423 THEN -61.340204
  WHEN 424 THEN -61.346657
  WHEN 425 THEN -61.342817
  WHEN 426 THEN -61.346425
  WHEN 427 THEN -61.347936
  WHEN 428 THEN -61.339477
  WHEN 429 THEN -61.362825
  WHEN 430 THEN -61.338833
  WHEN 431 THEN -61.353586
  WHEN 432 THEN -61.345647
  WHEN 433 THEN -61.350810
  WHEN 434 THEN -61.352223
  WHEN 435 THEN -61.338014
  WHEN 436 THEN -61.345205
  WHEN 437 THEN -61.340030
  WHEN 438 THEN -61.345834
  WHEN 439 THEN -61.366192
  WHEN 440 THEN -61.335140
  WHEN 441 THEN -61.341378
  WHEN 442 THEN -61.356213
  WHEN 443 THEN -61.343719
  WHEN 444 THEN -61.357082
  WHEN 445 THEN -61.350794
  WHEN 446 THEN -61.358960
  WHEN 447 THEN -61.339759
  WHEN 448 THEN -61.354769
  WHEN 449 THEN -61.347839
  WHEN 450 THEN -61.337555
  WHEN 451 THEN -61.339345
  WHEN 452 THEN -61.349315
  WHEN 453 THEN -61.356787
  WHEN 454 THEN -61.353683
  WHEN 455 THEN -61.333993
  WHEN 456 THEN -61.336278
  WHEN 457 THEN -61.339622
  WHEN 458 THEN -61.351930
  WHEN 459 THEN -61.353569
  WHEN 460 THEN -61.345104
  WHEN 461 THEN -61.334480
  WHEN 462 THEN -61.342909
  WHEN 463 THEN -61.346401
  WHEN 464 THEN -61.339843
  WHEN 465 THEN -61.345788
  WHEN 466 THEN -61.347928
  WHEN 467 THEN -61.336756
  WHEN 468 THEN -61.364006
  WHEN 469 THEN -61.354203
  WHEN 470 THEN -61.352720
  WHEN 471 THEN -61.345417
  WHEN 472 THEN -61.357694
  WHEN 473 THEN -61.358334
  WHEN 474 THEN -61.359324
  WHEN 475 THEN -61.354467
  WHEN 476 THEN -61.359300
  WHEN 477 THEN -61.339496
  WHEN 478 THEN -61.347945
  WHEN 479 THEN -61.336287
  WHEN 480 THEN -61.355765
  WHEN 481 THEN -61.342565
  WHEN 482 THEN -61.340767
  WHEN 483 THEN -61.345736
  WHEN 484 THEN -61.337489
  WHEN 485 THEN -61.349040
  WHEN 486 THEN -61.350603
  WHEN 487 THEN -61.339316
  WHEN 488 THEN -61.343896
  WHEN 489 THEN -61.339340
  WHEN 490 THEN -61.342904
  WHEN 491 THEN -61.343414
  WHEN 492 THEN -61.358292
  WHEN 493 THEN -61.344695
  WHEN 494 THEN -61.352067
  WHEN 495 THEN -61.354365
  WHEN 496 THEN -61.352238
  WHEN 497 THEN -61.359084
  WHEN 498 THEN -61.345573
  WHEN 499 THEN -61.346469
  WHEN 500 THEN -61.353178
  WHEN 501 THEN -61.350705
  WHEN 502 THEN -61.359891
  WHEN 503 THEN -61.355244
  WHEN 504 THEN -61.354803
  WHEN 505 THEN -61.342129
  WHEN 506 THEN -61.347621
  WHEN 507 THEN -61.348539
  WHEN 508 THEN -61.352395
  WHEN 509 THEN -61.346707
  WHEN 510 THEN -61.335996
  WHEN 511 THEN -61.353327
  WHEN 512 THEN -61.343391
  WHEN 513 THEN -61.341162
  WHEN 514 THEN -61.337088
  WHEN 515 THEN -61.351327
  WHEN 516 THEN -61.347730
  WHEN 517 THEN -61.349922
  WHEN 518 THEN -61.338166
  WHEN 519 THEN -61.349988
  WHEN 520 THEN -61.344326
  WHEN 521 THEN -61.347966
  WHEN 522 THEN -61.346224
  WHEN 523 THEN -61.345715
  WHEN 524 THEN -61.351127
  WHEN 525 THEN -61.351667
  WHEN 526 THEN -61.344587
  WHEN 527 THEN -61.350173
  WHEN 528 THEN -61.358605
  WHEN 529 THEN -61.339773
  WHEN 530 THEN -61.340797
  WHEN 531 THEN -61.346575
  WHEN 532 THEN -61.351549
  WHEN 533 THEN -61.355493
  WHEN 534 THEN -61.343832
  WHEN 535 THEN -61.352944
  WHEN 536 THEN -61.334385
  WHEN 537 THEN -61.349677
  WHEN 538 THEN -61.356505
  WHEN 539 THEN -61.348468
  WHEN 540 THEN -61.354065
  WHEN 541 THEN -61.349534
  WHEN 542 THEN -61.342693
  WHEN 543 THEN -61.355718
  WHEN 544 THEN -61.344877
  WHEN 545 THEN -61.354420
  WHEN 546 THEN -61.349684
  WHEN 547 THEN -61.348174
  WHEN 548 THEN -61.355227
  WHEN 549 THEN -61.352206
  WHEN 550 THEN -61.354338
  WHEN 551 THEN -61.344288
  WHEN 552 THEN -61.351915
  WHEN 553 THEN -61.342901
  WHEN 554 THEN -61.339834
  WHEN 555 THEN -61.338986
  WHEN 556 THEN -61.352089
  WHEN 557 THEN -61.349651
  WHEN 558 THEN -61.346014
  WHEN 559 THEN -61.358961
  WHEN 560 THEN -61.351920
  WHEN 561 THEN -61.345889
  WHEN 562 THEN -61.360373
  WHEN 563 THEN -61.357118
  WHEN 564 THEN -61.342478
  WHEN 565 THEN -61.358307
  WHEN 566 THEN -61.340623
  WHEN 567 THEN -61.340314
  WHEN 568 THEN -61.334801
  WHEN 569 THEN -61.351690
  WHEN 570 THEN -61.334185
  WHEN 571 THEN -61.344730
  WHEN 572 THEN -61.349049
  WHEN 573 THEN -61.342205
  WHEN 574 THEN -61.349836
  WHEN 575 THEN -61.338621
  WHEN 576 THEN -61.350861
  WHEN 577 THEN -61.357936
  WHEN 578 THEN -61.366599
  WHEN 579 THEN -61.345270
  WHEN 580 THEN -61.343757
  WHEN 581 THEN -61.342290
  WHEN 582 THEN -61.344385
  WHEN 583 THEN -61.355839
  WHEN 584 THEN -61.346857
  WHEN 585 THEN -61.348407
  WHEN 586 THEN -61.348143
  WHEN 587 THEN -61.346985
  WHEN 588 THEN -61.347382
  WHEN 589 THEN -61.339684
  WHEN 590 THEN -61.357379
  WHEN 591 THEN -61.334579
  WHEN 592 THEN -61.355463
  WHEN 593 THEN -61.345884
  WHEN 594 THEN -61.331833
  WHEN 595 THEN -61.342197
  WHEN 596 THEN -61.351835
  WHEN 597 THEN -61.342986
  WHEN 598 THEN -61.336003
  WHEN 599 THEN -61.341727
  WHEN 600 THEN -61.337940
  WHEN 601 THEN -61.358779
  WHEN 602 THEN -61.328472
  WHEN 603 THEN -61.358649
  WHEN 604 THEN -61.347712
  WHEN 605 THEN -61.349821
  WHEN 606 THEN -61.328835
  WHEN 607 THEN -61.365829
  WHEN 608 THEN -61.345393
  WHEN 609 THEN -61.346000
  WHEN 610 THEN -61.348581
  WHEN 611 THEN -61.342242
  WHEN 612 THEN -61.339078
  WHEN 613 THEN -61.343735
  WHEN 614 THEN -61.353827
  WHEN 615 THEN -61.348960
  WHEN 616 THEN -61.336619
  WHEN 617 THEN -61.336064
  WHEN 618 THEN -61.352816
  WHEN 619 THEN -61.350541
  WHEN 620 THEN -61.352627
  WHEN 621 THEN -61.339021
  WHEN 622 THEN -61.361191
  WHEN 623 THEN -61.344905
  WHEN 624 THEN -61.355295
  WHEN 625 THEN -61.352640
  WHEN 626 THEN -61.346322
  WHEN 627 THEN -61.356586
  WHEN 628 THEN -61.343236
  WHEN 629 THEN -61.344438
  WHEN 630 THEN -61.353018
  WHEN 631 THEN -61.349085
  WHEN 632 THEN -61.340310
  WHEN 633 THEN -61.352915
  WHEN 634 THEN -61.344823
  WHEN 635 THEN -61.352648
  WHEN 636 THEN -61.340412
  WHEN 637 THEN -61.339043
  WHEN 638 THEN -61.361828
  WHEN 639 THEN -61.342834
  WHEN 640 THEN -61.346817
  WHEN 641 THEN -61.342963
  WHEN 642 THEN -61.345751
  WHEN 643 THEN -61.346918
  WHEN 644 THEN -61.358957
  WHEN 645 THEN -61.350773
  WHEN 646 THEN -61.350727
  WHEN 647 THEN -61.356961
  WHEN 648 THEN -61.347974
  WHEN 649 THEN -61.340767
  WHEN 650 THEN -61.348049
  WHEN 651 THEN -61.347087
  WHEN 652 THEN -61.346096
  WHEN 653 THEN -61.342292
  WHEN 654 THEN -61.352870
  WHEN 655 THEN -61.335471
  WHEN 656 THEN -61.345800
  WHEN 657 THEN -61.336303
  WHEN 658 THEN -61.345472
  WHEN 659 THEN -61.341621
  WHEN 660 THEN -61.346238
  WHEN 661 THEN -61.343662
  WHEN 662 THEN -61.345539
  WHEN 663 THEN -61.359094
  WHEN 664 THEN -61.350060
  WHEN 665 THEN -61.350316
  WHEN 666 THEN -61.351117
  WHEN 667 THEN -61.348210
  WHEN 668 THEN -61.350801
  WHEN 669 THEN -61.342186
  WHEN 670 THEN -61.332501
  WHEN 671 THEN -61.344607
  WHEN 672 THEN -61.346584
  WHEN 673 THEN -61.353179
  WHEN 674 THEN -61.357155
  WHEN 675 THEN -61.345696
  WHEN 676 THEN -61.359403
  WHEN 677 THEN -61.352872
  WHEN 678 THEN -61.339002
  WHEN 679 THEN -61.348222
  WHEN 680 THEN -61.350559
  WHEN 681 THEN -61.340244
  WHEN 682 THEN -61.362141
  WHEN 683 THEN -61.351244
  WHEN 684 THEN -61.347962
  WHEN 685 THEN -61.342564
  WHEN 686 THEN -61.345710
  WHEN 687 THEN -61.364496
  WHEN 688 THEN -61.338844
  WHEN 689 THEN -61.353315
  WHEN 690 THEN -61.362220
  WHEN 691 THEN -61.340734
  WHEN 692 THEN -61.353909
  WHEN 693 THEN -61.352427
  WHEN 694 THEN -61.352579
  WHEN 695 THEN -61.342639
  WHEN 696 THEN -61.348615
  WHEN 697 THEN -61.341670
  WHEN 698 THEN -61.338005
  WHEN 699 THEN -61.342001
  WHEN 700 THEN -61.344402
  WHEN 701 THEN -61.345616
  WHEN 702 THEN -61.357875
  WHEN 703 THEN -61.345887
  WHEN 704 THEN -61.353152
  WHEN 705 THEN -61.348990
  WHEN 706 THEN -61.335175
  WHEN 707 THEN -61.363115
  WHEN 708 THEN -61.357148
  WHEN 709 THEN -61.351669
  WHEN 710 THEN -61.340655
  WHEN 711 THEN -61.344385
  WHEN 712 THEN -61.344100
  WHEN 713 THEN -61.349051
  WHEN 714 THEN -61.343882
  WHEN 715 THEN -61.348296
  WHEN 716 THEN -61.363459
  WHEN 717 THEN -61.355375
  WHEN 718 THEN -61.347092
  WHEN 719 THEN -61.350933
  WHEN 720 THEN -61.340464
  WHEN 721 THEN -61.352980
  WHEN 722 THEN -61.352947
  WHEN 723 THEN -61.359765
  WHEN 724 THEN -61.343000
  WHEN 725 THEN -61.353485
  WHEN 726 THEN -61.346072
  WHEN 727 THEN -61.347377
  WHEN 728 THEN -61.350362
  WHEN 729 THEN -61.350312
  WHEN 730 THEN -61.356567
  WHEN 731 THEN -61.344931
  WHEN 732 THEN -61.351523
  WHEN 733 THEN -61.361401
  WHEN 734 THEN -61.350701
  WHEN 735 THEN -61.356612
  WHEN 736 THEN -61.351268
  WHEN 737 THEN -61.348244
  WHEN 738 THEN -61.340170
  WHEN 739 THEN -61.354894
  WHEN 740 THEN -61.352214
  WHEN 741 THEN -61.334242
  WHEN 742 THEN -61.351823
  WHEN 743 THEN -61.347630
  WHEN 744 THEN -61.347375
  WHEN 745 THEN -61.349538
  WHEN 746 THEN -61.343620
  WHEN 747 THEN -61.351628
  WHEN 748 THEN -61.343396
  WHEN 749 THEN -61.355306
  WHEN 750 THEN -61.353954
  WHEN 751 THEN -61.342857
  WHEN 752 THEN -61.341591
  WHEN 753 THEN -61.352368
  WHEN 754 THEN -61.356243
  WHEN 755 THEN -61.342893
  WHEN 756 THEN -61.338638
  WHEN 757 THEN -61.356167
  WHEN 758 THEN -61.364360
  WHEN 759 THEN -61.337297
  WHEN 760 THEN -61.344050
  WHEN 761 THEN -61.346151
  WHEN 762 THEN -61.338022
  WHEN 763 THEN -61.349330
  WHEN 764 THEN -61.339802
  WHEN 765 THEN -61.342533
  WHEN 766 THEN -61.339541
  WHEN 767 THEN -61.342962
  WHEN 768 THEN -61.344052
  WHEN 769 THEN -61.356311
  WHEN 770 THEN -61.362149
  WHEN 771 THEN -61.350085
  WHEN 772 THEN -61.340323
  WHEN 773 THEN -61.362066
  WHEN 774 THEN -61.334411
  WHEN 775 THEN -61.360839
  WHEN 776 THEN -61.341765
  WHEN 777 THEN -61.346725
  WHEN 778 THEN -61.345058
  WHEN 779 THEN -61.358221
  WHEN 780 THEN -61.364781
  WHEN 781 THEN -61.330722
  WHEN 782 THEN -61.339458
  WHEN 783 THEN -61.343587
  WHEN 784 THEN -61.355910
  WHEN 785 THEN -61.332941
  WHEN 786 THEN -61.345639
  WHEN 787 THEN -61.342841
  WHEN 788 THEN -61.339937
  WHEN 789 THEN -61.337302
  WHEN 790 THEN -61.354877
  WHEN 791 THEN -61.347780
  WHEN 792 THEN -61.348872
  WHEN 793 THEN -61.351476
  WHEN 794 THEN -61.353668
  WHEN 795 THEN -61.362209
  WHEN 796 THEN -61.341477
  WHEN 797 THEN -61.354239
  WHEN 798 THEN -61.357662
  WHEN 799 THEN -61.356619
  WHEN 800 THEN -61.358792
  WHEN 801 THEN -61.348889
  WHEN 802 THEN -61.348030
  WHEN 803 THEN -61.338490
  WHEN 804 THEN -61.341212
  WHEN 805 THEN -61.341649
  WHEN 806 THEN -61.344901
  WHEN 807 THEN -61.353720
  WHEN 808 THEN -61.346954
  WHEN 809 THEN -61.354025
  WHEN 810 THEN -61.341751
  WHEN 811 THEN -61.334635
  WHEN 812 THEN -61.346836
  WHEN 813 THEN -61.360505
  WHEN 814 THEN -61.341284
  WHEN 815 THEN -61.343732
  WHEN 816 THEN -61.359524
  WHEN 817 THEN -61.338915
  WHEN 818 THEN -61.355411
  WHEN 819 THEN -61.355875
  WHEN 820 THEN -61.357371
  WHEN 821 THEN -61.337530
  WHEN 822 THEN -61.344587
  WHEN 823 THEN -61.346506
  WHEN 824 THEN -61.360385
  WHEN 825 THEN -61.350582
  WHEN 826 THEN -61.356624
  WHEN 827 THEN -61.355901
  WHEN 828 THEN -61.349879
  WHEN 829 THEN -61.361264
  WHEN 830 THEN -61.339196
  WHEN 831 THEN -61.348462
  WHEN 832 THEN -61.357660
  WHEN 833 THEN -61.355425
  WHEN 834 THEN -61.342657
  WHEN 835 THEN -61.348605
  WHEN 836 THEN -61.353288
  WHEN 837 THEN -61.346469
  WHEN 838 THEN -61.331911
  WHEN 839 THEN -61.354383
  WHEN 840 THEN -61.353358
  WHEN 841 THEN -61.342840
  WHEN 842 THEN -61.347988
  WHEN 843 THEN -61.360716
  WHEN 844 THEN -61.344734
  WHEN 845 THEN -61.351807
  WHEN 846 THEN -61.348940
  WHEN 847 THEN -61.332567
  WHEN 848 THEN -61.360460
  WHEN 849 THEN -61.340887
  WHEN 850 THEN -61.349938
  WHEN 851 THEN -61.350391
  WHEN 852 THEN -61.349649
  WHEN 853 THEN -61.354350
  WHEN 854 THEN -61.345393
  WHEN 855 THEN -61.336262
  WHEN 856 THEN -61.342936
  WHEN 857 THEN -61.341092
  WHEN 858 THEN -61.347614
  WHEN 859 THEN -61.354836
  WHEN 860 THEN -61.339862
  WHEN 861 THEN -61.351633
  WHEN 862 THEN -61.345666
  WHEN 863 THEN -61.355516
  WHEN 864 THEN -61.353368
  WHEN 865 THEN -61.343378
  WHEN 866 THEN -61.360440
  WHEN 867 THEN -61.348584
  WHEN 868 THEN -61.346551
  WHEN 869 THEN -61.345465
  WHEN 870 THEN -61.347910
  WHEN 871 THEN -61.355984
  WHEN 872 THEN -61.346361
  WHEN 873 THEN -61.343212
  WHEN 874 THEN -61.351220
  WHEN 875 THEN -61.357232
  WHEN 876 THEN -61.337504
  WHEN 877 THEN -61.344577
  WHEN 878 THEN -61.351019
  WHEN 879 THEN -61.356254
  WHEN 880 THEN -61.355770
  WHEN 881 THEN -61.363113
  WHEN 882 THEN -61.338914
  WHEN 883 THEN -61.348788
  WHEN 884 THEN -61.354546
  WHEN 885 THEN -61.345233
  WHEN 886 THEN -61.337152
  WHEN 887 THEN -61.331181
  WHEN 888 THEN -61.344539
  WHEN 889 THEN -61.347700
  WHEN 890 THEN -61.343395
  WHEN 891 THEN -61.356232
  WHEN 892 THEN -61.355833
  WHEN 893 THEN -61.355780
  WHEN 894 THEN -61.352731
  WHEN 895 THEN -61.336407
  WHEN 896 THEN -61.345469
  WHEN 897 THEN -61.331825
  WHEN 898 THEN -61.349780
  WHEN 899 THEN -61.343112
  WHEN 900 THEN -61.341346
  WHEN 901 THEN -61.346134
  WHEN 902 THEN -61.337366
  WHEN 903 THEN -61.360473
  WHEN 904 THEN -61.333167
  WHEN 905 THEN -61.344089
  WHEN 906 THEN -61.345766
  WHEN 907 THEN -61.344267
  WHEN 908 THEN -61.350196
  WHEN 909 THEN -61.354105
  WHEN 910 THEN -61.347346
  WHEN 911 THEN -61.342938
  WHEN 912 THEN -61.350842
  WHEN 913 THEN -61.343064
  WHEN 914 THEN -61.351819
  WHEN 915 THEN -61.342371
  WHEN 916 THEN -61.359793
  WHEN 917 THEN -61.336380
  WHEN 918 THEN -61.347841
  WHEN 919 THEN -61.358078
  WHEN 920 THEN -61.365148
  WHEN 921 THEN -61.348493
  WHEN 922 THEN -61.345237
  WHEN 923 THEN -61.365091
  WHEN 924 THEN -61.343940
  WHEN 925 THEN -61.338805
  WHEN 926 THEN -61.358351
  WHEN 927 THEN -61.353690
  WHEN 928 THEN -61.341913
  WHEN 929 THEN -61.358639
  WHEN 930 THEN -61.338713
  WHEN 931 THEN -61.352228
  WHEN 932 THEN -61.347581
  WHEN 933 THEN -61.357743
  WHEN 934 THEN -61.341541
  WHEN 935 THEN -61.357832
  WHEN 936 THEN -61.354977
  WHEN 937 THEN -61.349353
  WHEN 938 THEN -61.341289
  WHEN 939 THEN -61.356188
  WHEN 940 THEN -61.350276
  WHEN 941 THEN -61.332873
  WHEN 942 THEN -61.347688
  WHEN 943 THEN -61.350200
  WHEN 944 THEN -61.345489
  WHEN 945 THEN -61.340507
  WHEN 946 THEN -61.353580
  WHEN 947 THEN -61.355988
  WHEN 948 THEN -61.339424
  WHEN 949 THEN -61.344298
  WHEN 950 THEN -61.354011
  WHEN 951 THEN -61.356032
  WHEN 952 THEN -61.358739
  WHEN 953 THEN -61.347460
  WHEN 954 THEN -61.356814
  WHEN 955 THEN -61.347656
  WHEN 956 THEN -61.353210
  WHEN 957 THEN -61.336888
  WHEN 958 THEN -61.343449
  WHEN 959 THEN -61.356159
  WHEN 960 THEN -61.341365
  WHEN 961 THEN -61.349065
  WHEN 962 THEN -61.351565
  WHEN 963 THEN -61.341739
  WHEN 964 THEN -61.346621
  WHEN 965 THEN -61.333945
  WHEN 966 THEN -61.348244
  WHEN 967 THEN -61.344572
  WHEN 968 THEN -61.348614
  WHEN 969 THEN -61.359748
  WHEN 970 THEN -61.348051
  WHEN 971 THEN -61.358446
  WHEN 972 THEN -61.349455
  WHEN 973 THEN -61.328112
  WHEN 974 THEN -61.343351
  WHEN 975 THEN -61.344114
  WHEN 976 THEN -61.353396
  WHEN 977 THEN -61.335880
  WHEN 978 THEN -61.352798
  WHEN 979 THEN -61.341193
  WHEN 980 THEN -61.347520
  WHEN 981 THEN -61.348956
  WHEN 982 THEN -61.355577
  WHEN 983 THEN -61.346699
  WHEN 984 THEN -61.351074
  WHEN 985 THEN -61.353594
  WHEN 986 THEN -61.355041
  WHEN 987 THEN -61.332078
  WHEN 988 THEN -61.337865
  WHEN 989 THEN -61.346687
  WHEN 990 THEN -61.339491
  WHEN 991 THEN -61.351400
  WHEN 992 THEN -61.341469
  WHEN 993 THEN -61.344868
  WHEN 994 THEN -61.365423
  WHEN 995 THEN -61.343768
  WHEN 996 THEN -61.344512
  WHEN 997 THEN -61.355337
  WHEN 998 THEN -61.342144
  WHEN 999 THEN -61.348345
  WHEN 1000 THEN -61.344101
  WHEN 1001 THEN -61.351725
  WHEN 1002 THEN -61.365516
  WHEN 1003 THEN -61.355862
  WHEN 1004 THEN -61.344097
  WHEN 1005 THEN -61.341611
  WHEN 1006 THEN -61.358570
  WHEN 1007 THEN -61.347378
  WHEN 1008 THEN -61.359713
  WHEN 1009 THEN -61.352181
  WHEN 1010 THEN -61.352624
  WHEN 1011 THEN -61.356677
  WHEN 1012 THEN -61.337612
  WHEN 1013 THEN -61.342364
  WHEN 1014 THEN -61.351994
  WHEN 1015 THEN -61.349908
  WHEN 1016 THEN -61.335772
  WHEN 1017 THEN -61.349880
  WHEN 1018 THEN -61.341648
  WHEN 1019 THEN -61.345384
  WHEN 1020 THEN -61.348150
  WHEN 1021 THEN -61.350229
  WHEN 1022 THEN -61.341743
  WHEN 1023 THEN -61.358383
  WHEN 1024 THEN -61.352968
  WHEN 1025 THEN -61.346396
  WHEN 1026 THEN -61.352271
  WHEN 1027 THEN -61.340872
  WHEN 1028 THEN -61.342073
  WHEN 1029 THEN -61.358502
  WHEN 1030 THEN -61.359216
  WHEN 1031 THEN -61.344126
  WHEN 1032 THEN -61.354715
  WHEN 1033 THEN -61.350794
  WHEN 1034 THEN -61.351105
  WHEN 1035 THEN -61.339412
  WHEN 1036 THEN -61.354693
  WHEN 1037 THEN -61.349103
  WHEN 1038 THEN -61.340357
  WHEN 1039 THEN -61.353143
  WHEN 1040 THEN -61.354397
  WHEN 1041 THEN -61.347757
  WHEN 1042 THEN -61.352347
  WHEN 1043 THEN -61.349145
  WHEN 1044 THEN -61.344098
  WHEN 1045 THEN -61.330886
  WHEN 1046 THEN -61.351355
  WHEN 1047 THEN -61.349179
  WHEN 1048 THEN -61.353511
  WHEN 1049 THEN -61.349359
  WHEN 1050 THEN -61.346767
  WHEN 1051 THEN -61.352257
  WHEN 1052 THEN -61.347079
  WHEN 1053 THEN -61.348931
  WHEN 1054 THEN -61.339832
  WHEN 1055 THEN -61.348707
  WHEN 1056 THEN -61.355551
  WHEN 1057 THEN -61.345872
  WHEN 1058 THEN -61.334021
  WHEN 1059 THEN -61.345515
  WHEN 1060 THEN -61.347713
  WHEN 1061 THEN -61.346547
  WHEN 1062 THEN -61.349605
  WHEN 1063 THEN -61.347931
  WHEN 1064 THEN -61.355401
  WHEN 1065 THEN -61.346534
  WHEN 1066 THEN -61.356258
  WHEN 1067 THEN -61.350607
  WHEN 1068 THEN -61.345353
  WHEN 1069 THEN -61.361186
  WHEN 1070 THEN -61.343890
  WHEN 1071 THEN -61.348351
  WHEN 1072 THEN -61.356004
  WHEN 1073 THEN -61.345233
  WHEN 1074 THEN -61.343904
  WHEN 1075 THEN -61.353598
  WHEN 1076 THEN -61.348082
  WHEN 1077 THEN -61.340023
  WHEN 1078 THEN -61.350523
  WHEN 1079 THEN -61.354466
  WHEN 1080 THEN -61.356541
  WHEN 1081 THEN -61.354875
  WHEN 1082 THEN -61.335548
  WHEN 1083 THEN -61.356458
  WHEN 1084 THEN -61.354213
  WHEN 1085 THEN -61.346593
  WHEN 1086 THEN -61.344688
  WHEN 1087 THEN -61.355100
  WHEN 1088 THEN -61.358488
  WHEN 1089 THEN -61.351796
  WHEN 1090 THEN -61.347700
  WHEN 1091 THEN -61.352406
  WHEN 1092 THEN -61.344891
  WHEN 1093 THEN -61.343612
  WHEN 1094 THEN -61.348392
  WHEN 1095 THEN -61.337296
  WHEN 1096 THEN -61.337208
  WHEN 1097 THEN -61.345383
  WHEN 1098 THEN -61.354255
  WHEN 1099 THEN -61.358230
  WHEN 1100 THEN -61.347962
  WHEN 1101 THEN -61.331577
  WHEN 1102 THEN -61.359816
  WHEN 1103 THEN -61.354877
  WHEN 1104 THEN -61.343946
  WHEN 1105 THEN -61.363939
  WHEN 1106 THEN -61.355501
  WHEN 1107 THEN -61.351345
  WHEN 1108 THEN -61.359452
  WHEN 1109 THEN -61.345544
  WHEN 1110 THEN -61.343267
  WHEN 1111 THEN -61.348729
  WHEN 1112 THEN -61.344044
  WHEN 1113 THEN -61.341796
  WHEN 1114 THEN -61.354128
  WHEN 1115 THEN -61.348291
  WHEN 1116 THEN -61.340024
  WHEN 1117 THEN -61.363528
  WHEN 1118 THEN -61.346166
  WHEN 1119 THEN -61.347732
  WHEN 1120 THEN -61.346133
  WHEN 1121 THEN -61.329739
  WHEN 1122 THEN -61.333045
  WHEN 1123 THEN -61.354316
  WHEN 1124 THEN -61.331382
  WHEN 1125 THEN -61.340586
  WHEN 1126 THEN -61.342140
  WHEN 1127 THEN -61.349048
  WHEN 1128 THEN -61.344672
  WHEN 1129 THEN -61.354001
  WHEN 1130 THEN -61.352110
  WHEN 1131 THEN -61.359173
  WHEN 1132 THEN -61.342727
  WHEN 1133 THEN -61.339014
  WHEN 1134 THEN -61.341071
  WHEN 1135 THEN -61.341517
  WHEN 1136 THEN -61.349053
  WHEN 1137 THEN -61.344268
  WHEN 1138 THEN -61.343775
  WHEN 1139 THEN -61.352387
  WHEN 1140 THEN -61.354374
  WHEN 1141 THEN -61.355380
  WHEN 1142 THEN -61.348333
  WHEN 1143 THEN -61.349868
  WHEN 1144 THEN -61.351303
  WHEN 1145 THEN -61.350653
  WHEN 1146 THEN -61.356846
  WHEN 1147 THEN -61.355739
  WHEN 1148 THEN -61.349376
  WHEN 1149 THEN -61.339698
  WHEN 1150 THEN -61.359933
  WHEN 1151 THEN -61.353987
  WHEN 1152 THEN -61.358950
  WHEN 1153 THEN -61.338153
  WHEN 1154 THEN -61.342250
  WHEN 1155 THEN -61.349103
  WHEN 1156 THEN -61.338971
  WHEN 1157 THEN -61.341008
  WHEN 1158 THEN -61.341510
  WHEN 1159 THEN -61.360600
  WHEN 1160 THEN -61.334686
  WHEN 1161 THEN -61.340266
  WHEN 1162 THEN -61.342420
  WHEN 1163 THEN -61.343098
  WHEN 1164 THEN -61.340239
  WHEN 1165 THEN -61.342464
  WHEN 1166 THEN -61.343631
  WHEN 1167 THEN -61.344122
  WHEN 1168 THEN -61.346049
  WHEN 1169 THEN -61.348060
  WHEN 1170 THEN -61.344084
  WHEN 1171 THEN -61.328251
  WHEN 1172 THEN -61.343343
  WHEN 1173 THEN -61.337130
  WHEN 1174 THEN -61.337889
  WHEN 1175 THEN -61.354581
  WHEN 1176 THEN -61.345876
  WHEN 1177 THEN -61.337869
  WHEN 1178 THEN -61.342225
  WHEN 1179 THEN -61.341055
  WHEN 1180 THEN -61.337090
  WHEN 1181 THEN -61.351258
  WHEN 1182 THEN -61.342236
  WHEN 1183 THEN -61.347334
  WHEN 1184 THEN -61.365295
  WHEN 1185 THEN -61.346237
  WHEN 1186 THEN -61.349350
  WHEN 1187 THEN -61.366687
  WHEN 1188 THEN -61.342864
  WHEN 1189 THEN -61.339773
  WHEN 1190 THEN -61.346158
  WHEN 1191 THEN -61.356798
  WHEN 1192 THEN -61.332815
  WHEN 1193 THEN -61.343399
  WHEN 1194 THEN -61.360268
  WHEN 1195 THEN -61.335432
  WHEN 1196 THEN -61.353576
  WHEN 1197 THEN -61.362972
  WHEN 1198 THEN -61.360453
  WHEN 1199 THEN -61.334277
  WHEN 1200 THEN -61.349603
  WHEN 1201 THEN -61.341652
  WHEN 1202 THEN -61.354122
  WHEN 1203 THEN -61.343166
  WHEN 1204 THEN -61.362212
  WHEN 1205 THEN -61.353593
  WHEN 1206 THEN -61.350384
  WHEN 1207 THEN -61.355171
  WHEN 1208 THEN -61.341872
  WHEN 1209 THEN -61.334660
  WHEN 1210 THEN -61.343988
  WHEN 1211 THEN -61.330147
  WHEN 1212 THEN -61.352523
  WHEN 1213 THEN -61.347516
  WHEN 1214 THEN -61.349464
  WHEN 1215 THEN -61.353426
  WHEN 1216 THEN -61.358439
  WHEN 1217 THEN -61.350755
  WHEN 1218 THEN -61.330542
  WHEN 1219 THEN -61.352540
  WHEN 1220 THEN -61.356321
  WHEN 1221 THEN -61.361384
  WHEN 1222 THEN -61.363396
  WHEN 1223 THEN -61.361312
  WHEN 1224 THEN -61.348878
  WHEN 1225 THEN -61.346649
  WHEN 1226 THEN -61.335103
  WHEN 1227 THEN -61.352366
  WHEN 1228 THEN -61.336629
  WHEN 1229 THEN -61.342868
  WHEN 1230 THEN -61.352752
  WHEN 1231 THEN -61.361170
  WHEN 1232 THEN -61.354889
  WHEN 1233 THEN -61.345357
  WHEN 1234 THEN -61.348701
  WHEN 1235 THEN -61.348987
  WHEN 1236 THEN -61.342260
  WHEN 1237 THEN -61.346963
  WHEN 1238 THEN -61.355991
  WHEN 1239 THEN -61.349886
  WHEN 1240 THEN -61.357599
  WHEN 1241 THEN -61.345215
  WHEN 1242 THEN -61.358306
  WHEN 1243 THEN -61.351393
  WHEN 1244 THEN -61.337971
  WHEN 1245 THEN -61.350369
  WHEN 1246 THEN -61.357057
  WHEN 1247 THEN -61.350863
  WHEN 1248 THEN -61.349409
  WHEN 1249 THEN -61.335098
  WHEN 1250 THEN -61.343085
  WHEN 1251 THEN -61.348470
  WHEN 1252 THEN -61.364440
  WHEN 1253 THEN -61.344698
  WHEN 1254 THEN -61.362024
  WHEN 1255 THEN -61.343532
  WHEN 1256 THEN -61.354317
  WHEN 1257 THEN -61.352279
  WHEN 1258 THEN -61.348547
  WHEN 1259 THEN -61.357684
  WHEN 1260 THEN -61.335883
  WHEN 1261 THEN -61.364802
  WHEN 1262 THEN -61.350873
  WHEN 1263 THEN -61.348069
  WHEN 1264 THEN -61.336977
  WHEN 1265 THEN -61.347513
  WHEN 1266 THEN -61.340289
  WHEN 1267 THEN -61.353458
  WHEN 1268 THEN -61.342326
  WHEN 1269 THEN -61.349809
  WHEN 1270 THEN -61.354270
  WHEN 1271 THEN -61.346934
  WHEN 1272 THEN -61.345339
  WHEN 1273 THEN -61.347604
  WHEN 1274 THEN -61.353697
  WHEN 1275 THEN -61.347900
  WHEN 1276 THEN -61.338935
  WHEN 1277 THEN -61.346088
  WHEN 1278 THEN -61.347802
  WHEN 1279 THEN -61.357682
  WHEN 1280 THEN -61.361074
  WHEN 1281 THEN -61.335384
  WHEN 1282 THEN -61.345464
  WHEN 1283 THEN -61.343689
  WHEN 1284 THEN -61.353807
  WHEN 1285 THEN -61.349886
  WHEN 1286 THEN -61.344913
  WHEN 1287 THEN -61.351677
  WHEN 1288 THEN -61.339556
  WHEN 1289 THEN -61.352585
  WHEN 1290 THEN -61.352835
  WHEN 1291 THEN -61.354955
  WHEN 1292 THEN -61.354058
  WHEN 1293 THEN -61.342554
  WHEN 1294 THEN -61.342499
  WHEN 1295 THEN -61.353026
  WHEN 1296 THEN -61.348661
  WHEN 1297 THEN -61.351864
  WHEN 1298 THEN -61.341511
  WHEN 1299 THEN -61.348046
  WHEN 1300 THEN -61.336124
  WHEN 1301 THEN -61.360915
  WHEN 1302 THEN -61.344869
  WHEN 1303 THEN -61.334292
  WHEN 1304 THEN -61.350724
  WHEN 1305 THEN -61.342542
  WHEN 1306 THEN -61.341295
  WHEN 1307 THEN -61.349365
  WHEN 1308 THEN -61.362771
  WHEN 1309 THEN -61.336752
  WHEN 1310 THEN -61.352777
  WHEN 1311 THEN -61.351270
  WHEN 1312 THEN -61.352876
  WHEN 1313 THEN -61.348345
  WHEN 1314 THEN -61.354797
  WHEN 1315 THEN -61.345419
  WHEN 1316 THEN -61.333408
  WHEN 1317 THEN -61.335912
  WHEN 1318 THEN -61.346842
  WHEN 1319 THEN -61.334274
  WHEN 1320 THEN -61.343710
  WHEN 1321 THEN -61.357580
  WHEN 1322 THEN -61.343624
  WHEN 1323 THEN -61.346932
  WHEN 1324 THEN -61.353402
  WHEN 1325 THEN -61.349167
  WHEN 1326 THEN -61.345854
  WHEN 1327 THEN -61.344547
  WHEN 1328 THEN -61.342566
  WHEN 1329 THEN -61.340091
  WHEN 1330 THEN -61.341151
  WHEN 1331 THEN -61.351922
  WHEN 1332 THEN -61.340254
  WHEN 1333 THEN -61.339346
  WHEN 1334 THEN -61.347001
  WHEN 1335 THEN -61.346880
  WHEN 1336 THEN -61.348990
  WHEN 1337 THEN -61.342346
  WHEN 1338 THEN -61.348320
  WHEN 1339 THEN -61.339259
  WHEN 1340 THEN -61.344979
  WHEN 1341 THEN -61.358941
  WHEN 1342 THEN -61.335576
  WHEN 1343 THEN -61.339428
  WHEN 1344 THEN -61.355720
  WHEN 1345 THEN -61.350279
  WHEN 1346 THEN -61.350493
  WHEN 1347 THEN -61.352364
  WHEN 1348 THEN -61.335417
  WHEN 1349 THEN -61.344304
  WHEN 1350 THEN -61.341883
  WHEN 1351 THEN -61.355584
  WHEN 1352 THEN -61.344039
  WHEN 1353 THEN -61.347110
  WHEN 1354 THEN -61.348337
  WHEN 1355 THEN -61.356605
  WHEN 1356 THEN -61.339799
  WHEN 1357 THEN -61.351205
  WHEN 1358 THEN -61.344790
  WHEN 1359 THEN -61.351612
  WHEN 1360 THEN -61.348519
  WHEN 1361 THEN -61.330469
  WHEN 1362 THEN -61.345856
  WHEN 1363 THEN -61.343820
  WHEN 1364 THEN -61.341312
  WHEN 1365 THEN -61.342494
  WHEN 1366 THEN -61.350540
  WHEN 1367 THEN -61.339718
  WHEN 1368 THEN -61.350964
  WHEN 1369 THEN -61.352695
  WHEN 1370 THEN -61.344951
  WHEN 1371 THEN -61.338879
  WHEN 1372 THEN -61.329570
  WHEN 1373 THEN -61.355209
  WHEN 1374 THEN -61.356836
  WHEN 1375 THEN -61.341806
  WHEN 1376 THEN -61.348363
  WHEN 1377 THEN -61.344023
  WHEN 1378 THEN -61.346474
  WHEN 1379 THEN -61.351146
  WHEN 1380 THEN -61.360180
  WHEN 1381 THEN -61.345967
  WHEN 1382 THEN -61.335650
  WHEN 1383 THEN -61.363528
  WHEN 1384 THEN -61.344976
  WHEN 1385 THEN -61.339914
  WHEN 1386 THEN -61.353155
  WHEN 1387 THEN -61.354836
  WHEN 1388 THEN -61.340387
  WHEN 1389 THEN -61.351932
  WHEN 1390 THEN -61.353239
  WHEN 1391 THEN -61.353065
  WHEN 1392 THEN -61.349093
  WHEN 1393 THEN -61.339335
  WHEN 1394 THEN -61.360327
  WHEN 1395 THEN -61.347843
  WHEN 1396 THEN -61.364706
  WHEN 1397 THEN -61.346857
  WHEN 1398 THEN -61.337829
  WHEN 1399 THEN -61.337721
  WHEN 1400 THEN -61.344057
  WHEN 1401 THEN -61.350740
  WHEN 1402 THEN -61.335621
  WHEN 1403 THEN -61.335370
  WHEN 1404 THEN -61.334038
  WHEN 1405 THEN -61.342072
  WHEN 1406 THEN -61.343505
  WHEN 1407 THEN -61.351444
  WHEN 1408 THEN -61.338515
  WHEN 1409 THEN -61.354327
  WHEN 1410 THEN -61.333880
  WHEN 1411 THEN -61.355834
  WHEN 1412 THEN -61.358716
  WHEN 1413 THEN -61.351425
  WHEN 1414 THEN -61.353889
  WHEN 1415 THEN -61.341779
  WHEN 1416 THEN -61.348297
  WHEN 1417 THEN -61.356222
  WHEN 1418 THEN -61.348396
  WHEN 1419 THEN -61.352042
  WHEN 1420 THEN -61.355701
  WHEN 1421 THEN -61.355516
  WHEN 1422 THEN -61.354346
  WHEN 1423 THEN -61.353956
  WHEN 1424 THEN -61.348709
  WHEN 1425 THEN -61.347634
  WHEN 1426 THEN -61.352987
  WHEN 1427 THEN -61.346625
  WHEN 1428 THEN -61.347422
  WHEN 1429 THEN -61.347580
  WHEN 1430 THEN -61.351930
  WHEN 1431 THEN -61.359331
  WHEN 1432 THEN -61.347272
  WHEN 1433 THEN -61.352264
  WHEN 1434 THEN -61.348435
  WHEN 1435 THEN -61.348988
  WHEN 1436 THEN -61.354082
  WHEN 1437 THEN -61.348300
  WHEN 1438 THEN -61.345837
  WHEN 1439 THEN -61.350004
  WHEN 1440 THEN -61.336405
  WHEN 1441 THEN -61.347086
  WHEN 1442 THEN -61.356139
  WHEN 1443 THEN -61.341867
  WHEN 1444 THEN -61.342957
  WHEN 1445 THEN -61.341180
  WHEN 1446 THEN -61.359339
  WHEN 1447 THEN -61.356845
  WHEN 1448 THEN -61.345535
  WHEN 1449 THEN -61.352262
  WHEN 1450 THEN -61.355565
  WHEN 1451 THEN -61.357130
  WHEN 1452 THEN -61.344410
  WHEN 1453 THEN -61.348077
  WHEN 1454 THEN -61.352441
  WHEN 1455 THEN -61.348279
  WHEN 1456 THEN -61.351138
  WHEN 1457 THEN -61.359393
  WHEN 1458 THEN -61.343346
  WHEN 1459 THEN -61.337632
  WHEN 1460 THEN -61.351947
  WHEN 1461 THEN -61.336943
  WHEN 1462 THEN -61.343334
  WHEN 1463 THEN -61.358112
  WHEN 1464 THEN -61.339413
  WHEN 1465 THEN -61.349023
  WHEN 1466 THEN -61.353079
  WHEN 1467 THEN -61.350962
  WHEN 1468 THEN -61.351484
  WHEN 1469 THEN -61.351022
  WHEN 1470 THEN -61.348087
  WHEN 1471 THEN -61.340267
  WHEN 1472 THEN -61.351697
  WHEN 1473 THEN -61.357457
  WHEN 1474 THEN -61.350368
  WHEN 1475 THEN -61.352111
  WHEN 1476 THEN -61.343821
  WHEN 1477 THEN -61.341918
  WHEN 1478 THEN -61.354947
  WHEN 1479 THEN -61.342496
  WHEN 1480 THEN -61.338602
  WHEN 1481 THEN -61.353031
  WHEN 1482 THEN -61.348432
  WHEN 1483 THEN -61.358816
  WHEN 1484 THEN -61.343454
  WHEN 1485 THEN -61.344436
  WHEN 1486 THEN -61.362799
  WHEN 1487 THEN -61.340386
  WHEN 1488 THEN -61.348853
  WHEN 1489 THEN -61.348846
  WHEN 1490 THEN -61.334761
  WHEN 1491 THEN -61.358959
  WHEN 1492 THEN -61.346524
  WHEN 1493 THEN -61.352215
  WHEN 1494 THEN -61.349200
  WHEN 1495 THEN -61.352569
  WHEN 1496 THEN -61.347308
  WHEN 1497 THEN -61.341472
  WHEN 1498 THEN -61.352113
  WHEN 1499 THEN -61.340948
  WHEN 1500 THEN -61.350579
  WHEN 1501 THEN -61.348719
  WHEN 1502 THEN -61.346392
  WHEN 1503 THEN -61.347471
  WHEN 1504 THEN -61.352522
  WHEN 1505 THEN -61.339100
  WHEN 1506 THEN -61.334966
  WHEN 1507 THEN -61.346270
  WHEN 1508 THEN -61.348072
  WHEN 1509 THEN -61.351059
  WHEN 1510 THEN -61.347127
  WHEN 1511 THEN -61.353420
  WHEN 1512 THEN -61.337743
  WHEN 1513 THEN -61.339776
  WHEN 1514 THEN -61.342633
  WHEN 1515 THEN -61.338988
  WHEN 1516 THEN -61.351467
  WHEN 1517 THEN -61.349499
  WHEN 1518 THEN -61.345730
  WHEN 1519 THEN -61.350128
  WHEN 1520 THEN -61.333970
  WHEN 1521 THEN -61.340958
  WHEN 1522 THEN -61.355740
  WHEN 1523 THEN -61.351826
  WHEN 1524 THEN -61.349820
  WHEN 1525 THEN -61.354304
  WHEN 1526 THEN -61.345357
  WHEN 1527 THEN -61.339589
  WHEN 1528 THEN -61.359413
  WHEN 1529 THEN -61.352848
  WHEN 1530 THEN -61.345812
  WHEN 1531 THEN -61.350838
  WHEN 1532 THEN -61.341701
  WHEN 1533 THEN -61.351621
  WHEN 1534 THEN -61.360857
  WHEN 1535 THEN -61.349153
  WHEN 1536 THEN -61.357173
  WHEN 1537 THEN -61.339945
  WHEN 1538 THEN -61.339239
  WHEN 1539 THEN -61.359270
  WHEN 1540 THEN -61.354168
  WHEN 1541 THEN -61.340983
  WHEN 1542 THEN -61.345043
  WHEN 1543 THEN -61.353431
  WHEN 1544 THEN -61.360034
  WHEN 1545 THEN -61.342792
  WHEN 1546 THEN -61.336114
  WHEN 1547 THEN -61.354424
  WHEN 1548 THEN -61.349922
  WHEN 1549 THEN -61.347722
  WHEN 1550 THEN -61.349132
  WHEN 1551 THEN -61.351023
  WHEN 1552 THEN -61.345446
  WHEN 1553 THEN -61.334900
  WHEN 1554 THEN -61.358218
  WHEN 1555 THEN -61.348325
  WHEN 1556 THEN -61.336960
  WHEN 1557 THEN -61.347189
  WHEN 1558 THEN -61.342930
  WHEN 1559 THEN -61.343792
  WHEN 1560 THEN -61.335628
  WHEN 1561 THEN -61.353352
  WHEN 1562 THEN -61.351214
  WHEN 1563 THEN -61.343615
  WHEN 1564 THEN -61.360505
  WHEN 1565 THEN -61.347518
  WHEN 1566 THEN -61.352424
  WHEN 1567 THEN -61.359528
  WHEN 1568 THEN -61.338079
  WHEN 1569 THEN -61.355240
  WHEN 1570 THEN -61.347209
  WHEN 1571 THEN -61.353271
  WHEN 1572 THEN -61.345844
  WHEN 1573 THEN -61.343490
  WHEN 1574 THEN -61.354299
  WHEN 1575 THEN -61.342877
  WHEN 1576 THEN -61.343762
  WHEN 1577 THEN -61.353272
  WHEN 1578 THEN -61.352801
  WHEN 1579 THEN -61.349521
  WHEN 1580 THEN -61.341538
  WHEN 1581 THEN -61.338985
  WHEN 1582 THEN -61.348852
  WHEN 1583 THEN -61.352528
  WHEN 1584 THEN -61.352708
  WHEN 1585 THEN -61.347790
  WHEN 1586 THEN -61.342893
  WHEN 1587 THEN -61.343986
  WHEN 1588 THEN -61.347222
  WHEN 1589 THEN -61.343274
  WHEN 1590 THEN -61.359946
  WHEN 1591 THEN -61.338512
  WHEN 1592 THEN -61.355581
  WHEN 1593 THEN -61.352934
  WHEN 1594 THEN -61.339827
  WHEN 1595 THEN -61.357524
  WHEN 1596 THEN -61.361797
  WHEN 1597 THEN -61.346346
  WHEN 1598 THEN -61.333198
  WHEN 1599 THEN -61.342596
  WHEN 1600 THEN -61.328897
  WHEN 1601 THEN -61.342264
  WHEN 1602 THEN -61.341273
  WHEN 1603 THEN -61.345058
  WHEN 1604 THEN -61.352633
  WHEN 1605 THEN -61.352179
  WHEN 1606 THEN -61.357716
  WHEN 1607 THEN -61.358750
  WHEN 1608 THEN -61.342483
  WHEN 1609 THEN -61.348253
  WHEN 1610 THEN -61.344935
  WHEN 1611 THEN -61.348089
  WHEN 1612 THEN -61.338478
  WHEN 1613 THEN -61.349779
  WHEN 1614 THEN -61.355431
  WHEN 1615 THEN -61.361017
  WHEN 1616 THEN -61.354925
  WHEN 1617 THEN -61.353355
  WHEN 1618 THEN -61.353275
  WHEN 1619 THEN -61.343436
  WHEN 1620 THEN -61.343575
  WHEN 1621 THEN -61.349443
  WHEN 1622 THEN -61.330227
  WHEN 1623 THEN -61.363827
  WHEN 1624 THEN -61.346942
  WHEN 1625 THEN -61.336330
  WHEN 1626 THEN -61.360764
  WHEN 1627 THEN -61.342309
  WHEN 1628 THEN -61.347715
  WHEN 1629 THEN -61.343414
  WHEN 1630 THEN -61.345107
  WHEN 1631 THEN -61.354829
  WHEN 1632 THEN -61.354687
  WHEN 1633 THEN -61.340852
  WHEN 1634 THEN -61.345044
  WHEN 1635 THEN -61.350246
  WHEN 1636 THEN -61.341383
  WHEN 1637 THEN -61.345346
  WHEN 1638 THEN -61.334819
  WHEN 1639 THEN -61.355015
  WHEN 1640 THEN -61.350038
  WHEN 1641 THEN -61.359563
  WHEN 1642 THEN -61.345287
  WHEN 1643 THEN -61.346527
  WHEN 1644 THEN -61.358816
  WHEN 1645 THEN -61.359106
  WHEN 1646 THEN -61.363416
  WHEN 1647 THEN -61.347895
  WHEN 1648 THEN -61.347515
  WHEN 1649 THEN -61.346088
  WHEN 1650 THEN -61.349138
  WHEN 1651 THEN -61.352415
  WHEN 1652 THEN -61.342846
  WHEN 1653 THEN -61.348319
  WHEN 1654 THEN -61.360319
  WHEN 1655 THEN -61.364628
  WHEN 1656 THEN -61.340431
  WHEN 1657 THEN -61.345140
  WHEN 1658 THEN -61.340359
  WHEN 1659 THEN -61.342736
  WHEN 1660 THEN -61.353514
  WHEN 1661 THEN -61.338368
  WHEN 1662 THEN -61.345926
  WHEN 1663 THEN -61.342429
  WHEN 1664 THEN -61.343775
  WHEN 1665 THEN -61.355412
  WHEN 1666 THEN -61.344670
  WHEN 1667 THEN -61.349085
  WHEN 1668 THEN -61.348417
  WHEN 1669 THEN -61.354923
  WHEN 1670 THEN -61.351940
  WHEN 1671 THEN -61.344689
  WHEN 1672 THEN -61.354223
  WHEN 1673 THEN -61.345031
  WHEN 1674 THEN -61.356455
  WHEN 1675 THEN -61.345983
  WHEN 1676 THEN -61.337730
  WHEN 1677 THEN -61.344568
  WHEN 1678 THEN -61.345925
  WHEN 1679 THEN -61.347629
  WHEN 1680 THEN -61.344231
  WHEN 1681 THEN -61.361110
  WHEN 1682 THEN -61.342523
  WHEN 1683 THEN -61.350329
  WHEN 1684 THEN -61.357778
  WHEN 1685 THEN -61.338603
  WHEN 1686 THEN -61.337278
  WHEN 1687 THEN -61.349936
  WHEN 1688 THEN -61.350580
  WHEN 1689 THEN -61.346380
  WHEN 1690 THEN -61.361977
  WHEN 1691 THEN -61.350852
  WHEN 1692 THEN -61.343773
  WHEN 1693 THEN -61.349454
  WHEN 1694 THEN -61.351517
  WHEN 1695 THEN -61.350373
  WHEN 1696 THEN -61.353543
  WHEN 1697 THEN -61.343588
  WHEN 1698 THEN -61.351343
  WHEN 1699 THEN -61.355696
  WHEN 1700 THEN -61.347742
  WHEN 1701 THEN -61.341387
  WHEN 1702 THEN -61.351777
  WHEN 1703 THEN -61.345476
  WHEN 1704 THEN -61.335119
  WHEN 1705 THEN -61.350726
  WHEN 1706 THEN -61.342235
  WHEN 1707 THEN -61.350595
  WHEN 1708 THEN -61.353847
  WHEN 1709 THEN -61.347448
  WHEN 1710 THEN -61.348211
  WHEN 1711 THEN -61.345982
  WHEN 1712 THEN -61.339045
  WHEN 1713 THEN -61.336073
  WHEN 1714 THEN -61.337567
  WHEN 1715 THEN -61.355432
  WHEN 1716 THEN -61.349286
  WHEN 1717 THEN -61.344872
  WHEN 1718 THEN -61.351484
  WHEN 1719 THEN -61.344072
  WHEN 1720 THEN -61.350782
  WHEN 1721 THEN -61.342254
  WHEN 1722 THEN -61.347051
  WHEN 1723 THEN -61.347186
  WHEN 1724 THEN -61.352980
  WHEN 1725 THEN -61.351700
  WHEN 1726 THEN -61.351269
  WHEN 1727 THEN -61.356088
  WHEN 1728 THEN -61.354972
  WHEN 1729 THEN -61.345187
  WHEN 1730 THEN -61.348191
  WHEN 1731 THEN -61.343003
  WHEN 1732 THEN -61.330698
  WHEN 1733 THEN -61.344834
  WHEN 1734 THEN -61.336875
  WHEN 1735 THEN -61.345801
  WHEN 1736 THEN -61.350217
  WHEN 1737 THEN -61.348426
  WHEN 1738 THEN -61.342852
  WHEN 1739 THEN -61.355294
  WHEN 1740 THEN -61.351873
  WHEN 1741 THEN -61.330796
  WHEN 1742 THEN -61.350996
  WHEN 1743 THEN -61.348955
  WHEN 1744 THEN -61.347572
  WHEN 1745 THEN -61.349503
  WHEN 1746 THEN -61.337137
  WHEN 1747 THEN -61.350604
  WHEN 1748 THEN -61.339814
  WHEN 1749 THEN -61.350471
  WHEN 1750 THEN -61.349221
  WHEN 1751 THEN -61.354741
  WHEN 1752 THEN -61.335903
  WHEN 1753 THEN -61.341404
  WHEN 1754 THEN -61.353914
  WHEN 1755 THEN -61.346018
  WHEN 1756 THEN -61.360439
  WHEN 1757 THEN -61.350857
  WHEN 1758 THEN -61.347827
  WHEN 1759 THEN -61.344435
  WHEN 1760 THEN -61.337792
  WHEN 1761 THEN -61.352473
  WHEN 1762 THEN -61.345835
  WHEN 1763 THEN -61.348333
  WHEN 1764 THEN -61.358071
  WHEN 1765 THEN -61.341378
  WHEN 1766 THEN -61.339663
  WHEN 1767 THEN -61.351102
  WHEN 1768 THEN -61.350595
  WHEN 1769 THEN -61.355528
  WHEN 1770 THEN -61.346893
  WHEN 1771 THEN -61.333959
  WHEN 1772 THEN -61.350916
  WHEN 1773 THEN -61.349894
  WHEN 1774 THEN -61.347286
  WHEN 1775 THEN -61.348251
  WHEN 1776 THEN -61.347274
  WHEN 1777 THEN -61.353415
  WHEN 1778 THEN -61.330173
  WHEN 1779 THEN -61.338806
  WHEN 1780 THEN -61.344916
  WHEN 1781 THEN -61.349720
  WHEN 1782 THEN -61.352795
  WHEN 1783 THEN -61.337598
  WHEN 1784 THEN -61.349676
  WHEN 1785 THEN -61.355748
  WHEN 1786 THEN -61.356293
  WHEN 1787 THEN -61.343156
  WHEN 1788 THEN -61.356645
  WHEN 1789 THEN -61.348184
  WHEN 1790 THEN -61.349453
  WHEN 1791 THEN -61.350275
  WHEN 1792 THEN -61.327917
  WHEN 1793 THEN -61.345101
  WHEN 1794 THEN -61.356809
  WHEN 1795 THEN -61.351275
  WHEN 1796 THEN -61.358256
  WHEN 1797 THEN -61.337958
  WHEN 1798 THEN -61.347386
  ELSE -61.3565
END),
  -- 10% sin especie declarada (texto libre, mismo criterio que un reporte
  -- real donde el vecino no la completó) — EvaluarCoincidenciaReporte omite
  -- la búsqueda de coincidencias para esos casos, ver ERRORS.md.
  CASE WHEN t.tipo IN ('perdido', 'encontrado') AND random() < 0.9
       THEN (ARRAY['perro', 'gato'])[1 + floor(random() * 2)::int]
       ELSE NULL END,
  t.estado,
  now() - (random() * 56 || ' days')::interval
FROM generate_series(1, 1798) AS gs
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['perdido', 'encontrado', 'problematica'])[1 + floor(random() * 3)::int] AS tipo,
    (ARRAY['reportado', 'en_revision', 'en_atencion', 'resuelto', 'cerrado'])[1 + floor(random() * 5)::int] AS estado
) t
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

-- Par garantizado 'perdido' ↔ 'encontrado' coincidente en zona (a ~100m,
-- muy por debajo del radio de 5km de EvaluarCoincidenciaReporte) y especie
-- ('perro'), ambos activos ('reportado') — para poder demostrar/probar la
-- notificación reporte_coincidente sin depender del azar del bloque anterior.
INSERT INTO reportes (tipo, subtipo, reportado_por, mascota_id, descripcion, foto_url,
                       latitud, longitud, especie, estado, created_at)
SELECT 'perdido', NULL,
       (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
       NULL, 'Mi perro Toby se perdió cerca de la plaza central, es muy sociable.',
       'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/seed-match-perdido.jpg',
       -37.9989, -61.3565, 'perro', 'reportado', now() - interval '2 days'
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

INSERT INTO reportes (tipo, subtipo, reportado_por, mascota_id, descripcion, foto_url,
                       latitud, longitud, especie, estado, created_at)
SELECT 'encontrado', NULL,
       (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
       NULL, 'Encontré un perro suelto cerca de la plaza central, parece perdido.',
       'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/seed-match-encontrado.jpg',
       -37.9995, -61.3560, 'perro', 'reportado', now() - interval '1 day'
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

-- Historial de transiciones (1 a 3 por reporte, docs/SEED.md), siguiendo el
-- mismo camino lineal sin atajos que valida CambiarEstadoReporteCommand vía
-- ReporteEstado (State): reportado → en_revision → en_atencion → resuelto →
-- cerrado. Usa al propio reportante como autor del cambio para no depender
-- de un usuario con rol municipio/administrador ya sembrado. El par
-- garantizado de arriba queda deliberadamente en 'reportado' (activo) y no
-- genera historial.
WITH config AS (
  SELECT id AS reporte_id, reportado_por, created_at AS base,
         1 + floor(random() * 3)::int AS cantidad_pasos
  FROM reportes
  WHERE estado <> 'reportado'
    AND created_at > now() - interval '56 days'
),
pasos AS (
  SELECT reporte_id, reportado_por, base, gs AS paso
  FROM config
  CROSS JOIN LATERAL generate_series(1, cantidad_pasos) AS gs
)
INSERT INTO reportes_historial_estado (reporte_id, estado_anterior, estado_nuevo, usuario_id, registrado_en)
SELECT
  p.reporte_id,
  (ARRAY['reportado', 'en_revision', 'en_atencion', 'resuelto'])[p.paso],
  (ARRAY['en_revision', 'en_atencion', 'resuelto', 'cerrado'])[p.paso],
  p.reportado_por,
  p.base + (p.paso || ' days')::interval
FROM pasos p;

COMMIT;
