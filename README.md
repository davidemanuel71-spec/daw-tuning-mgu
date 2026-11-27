# DAW Tuning Cluster

Teme pentru ceasul (clusterul) BMW iDrive 7 (MGU), instalate prin MGU Store.

- **DAW Tuning**: alb si rosu, cu logo-ul DAW sus la mijloc
- **Craciun Rosu**, **Craciun Gheata**, **Craciun Auriu**
- **Albastru ca in poza (iX3)** si **Harta nativa sigura (1088x480)**, dupa ideile din [dwz365365/id7f](https://github.com/dwz365365/id7f)
- Harta Waze mare in mijloc (fereastra 1006x500, intre cadrane), prin `waze-on-cluster`
- Viteza stanga, turatia dreapta, ca la M view

Pornit de la [bimmer-lab/apps](https://github.com/bimmer-lab/apps) (MIT). Nu are legatura cu BMW AG. Foloseste-l parcat sau pe cont propriu, cu avertismentele masinii vizibile.

## Instalare

1. Ai deja MGU Store si `cluster-render` pe unitate (`cluster-render` vine din sursa `robertnisipeanu/idrive-apps`).
2. In Store: **Settings, Add source** si scrie `NUMELE_TAU/daw-tuning-mgu` (pune numele tau de GitHub).
3. Instaleaza **DAW Tuning Cluster**.
4. Deschide-o din meniul de aplicatii, alege tema, iar la **Map** porneste harta Waze in tema (Waze on Cluster trebuie sa ruleze).
5. Setarile implicite sunt km/h si ceas de 24 de ore. Seteaza fusul orar o data (unitatea tine ceasul in UTC).

## Dezvoltare

Vezi `docs/DEVELOPING.md`. Test local: `node bench/server.js daw_cluster` si deschide `http://localhost:8078`.
Layout-urile sunt in `apps/daw_cluster/hud/layouts/`. Logo-ul se refoloseste cu `tools/make_logo.py`.

Netestat inca pe masina. Ajusteaza pozitiile din layout-uri daca ceva se suprapune cu cutia de viteze BMW sau cu telltale-urile.
