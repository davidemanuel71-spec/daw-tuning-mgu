# DAW FULL MAP OEM · studio offline

Layout 1920×720 construit in straturi, randat offline (doar PNG, nu atinge masina, firmware-ul, codarea sau serviciile BMW).

    python3 studio/render.py     # scrie studio/out/preview.png, out/debug.png si out/layers/*.png

| Fisier (studio/layers) | Strat |
|---|---|
| 01_gauge_geometry.json | geometria cadranelor (curbe Bezier) · **in asteptarea calibrarii** |
| 02_gauge_scale.json | cifre si gradatii · **in asteptarea calibrarii** |
| 03_navigation_viewport.json | fereastra Waze (pastreaza proportia 1088×480) |
| 04_adaptive_mask.json | masca (acum superelipsa; dupa calibrare, din curba interioara) |
| 05_edge_blend.json | estompare spre negru (fara chenar) |
| 06_dynamic_instruments.json | viteza, turatia, combustibil, temperatura, treapta |
| 07_daw_branding.json | logo DAW TUNING |
| 08_bmw_safety.json | zone BMW (martori, avertizari) marcate doar in debug |

Nicio pozitie de cifra nu e inventata: straturile 01 si 02 raman goale pana la calibrare.
Conturul 'guide' din 01 e SVG-ul primit de la utilizator si e marcat neverificat.
