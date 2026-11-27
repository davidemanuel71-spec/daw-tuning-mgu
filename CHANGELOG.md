# Changelog

## 0.24.1
- Waze FULL SCREEN: fara beculete de sarbatoare, fara caseta neagra sub viteza si fara treapta dubla (ramane doar viteza). Un layout cu "garland": false nu mai primeste beculetele.

## 0.24.0 · Waze FULL SCREEN
- Tema noua **Waze FULL SCREEN (tot ceasul)**: harta CarPlay/Waze pe tot ceasul 1920x720, ca varianta full screen din id7f. Fara harta revine ceasul BMW original; cu harta, viteza si treapta DAW jos la mijloc peste harta.

## 0.23.0 · optiunile Waze din id7f
- In tab-ul Map (si in All settings): **Harta apare pe** (ceas, HUD, ambele, nicaieri), **Directii BMW** (ascunde/arata caseta BMW cat se vede harta), **HUD marime**, **HUD stanga/dreapta**, **HUD sus/jos**, **HUD peste pop-up**.
- Aceleasi comenzi ca aplicatia lui dwz365365/id7f catre Waze on Cluster (ctl.sock pe loc, patch.sock ca sa ramana salvate). Cod scris de la zero in `shared/waze_opts.js`.
- Toate pornesc pe **Lasa cum e**: dupa update nu se schimba nimic pana nu alegi ceva. O valoare aleasa se trimite o data si se tine minte; daca Waze e ocupat sau lipseste, reincearca la 5 s.

## 0.22.0 · idee din id7f
- Tema noua **Albastru ca in poza (iX3)**: look-ul din macheta lui dwz365365/id7f (harta mare intre cadrane, rama albastra, scari viteza/turatie, bara de jos). Fereastra hartii e cea din Craciun Rosu: 1460x550, X 230-1690, Y 75-625.
- Tema noua **Harta nativa sigura (1088x480)**: modul sigur din id7f 0.1.3. Tema nu deschide fereastra de harta, deci Waze on Cluster ramane in slotul nativ BMW de 1088x480, sub cadrane, cu toate informatiile BMW vizibile; daca harta fusese mutata pe panou, o trimite inapoi.
- Doar idei si valori din id7f (GPL-3.0); niciun fisier de cod copiat, proiectul ramane MIT.

## 0.1.0
- First version: DAW Tuning cluster theme and three Christmas editions (red, ice, gold), the DAW logo at the top, the Waze map window enlarged to 1006x500.

## 0.6.0
- Teme pe ceasul BMW original (limita de viteza, moduri de condus, Distronic/maini raman ale masinii) cu logo DAW, brad, fulgi si harta Waze intre cadrane, fara sa acopere cifrele.
- DAW Original, +Waze, Brad, Fulgi, Brad si Fulg, 4 Brazi, 4 Fulgi, Brad fara harta.

## 0.14.1 / 0.14.2 · DAW FULL WAZE
- Harta 1460x550 px (X 230-1690, Y 75-625, centru X 960), margini estompate 10 px, contur hexagonal exact.
