const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const sharp = require("sharp");
const app = express();
const sass = require('sass');

const chokidar = require('chokidar'); // Pentru monitorizare mai bună a fișierelor


global.obGlobal = {
    obErori: null
};


// Adaugă în obiectul global
global.obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, 'resurse/scss'),
    folderCss: path.join(__dirname, 'resurse/css'),
    folderBackup: path.join(__dirname, 'backup')
};

// Actualizează vectorul de foldere
const vect_foldere = ["temp", "backup"];



function initErori() {
    const eroriRaw = fs.readFileSync("erori.json");
    const eroriJson = JSON.parse(eroriRaw);

    eroriJson.info_erori.forEach(eroare => {
        eroare.imagine = path.join(eroriJson.cale_baza, eroare.imagine);
    });

    eroriJson.eroare_default.imagine = path.join(eroriJson.cale_baza, eroriJson.eroare_default.imagine);
    obGlobal.obErori = eroriJson;
}



// Funcția pentru crearea folderelor dacă nu există
function initFoldere() {
    vect_foldere.forEach(folder => {
        const caleFolder = path.join(__dirname, folder); // Calea absolută
        if (!fs.existsSync(caleFolder)) {
            fs.mkdirSync(caleFolder, { recursive: true });
            console.log(`Folderul ${caleFolder} a fost creat.`);
        } else {
            console.log(`Folderul ${caleFolder} există deja.`);
        }
    });
}


async function compileazaScss(caleScss, caleCss = null) {
    try {
        // Resolve paths
        const inputPath = path.isAbsolute(caleScss) 
            ? caleScss 
            : path.join(global.obGlobal.folderScss, caleScss);
        
        const outputPath = caleCss 
            ? (path.isAbsolute(caleCss) 
                ? caleCss 
                : path.join(global.obGlobal.folderCss, caleCss))
            : path.join(
                global.obGlobal.folderCss, 
                path.basename(caleScss, '.scss') + '.css'
            );

        // Create backup folder structure
        const backupDir = path.join(global.obGlobal.folderBackup, 'resurse', 'css');
        const backupPath = path.join(backupDir, path.basename(outputPath));

        await fs.ensureDir(backupDir);

        // Backup existing CSS if exists
        if (fs.existsSync(outputPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = `${path.basename(outputPath, '.css')}_${timestamp}.css`;
            await fs.copy(outputPath, path.join(backupDir, backupFile));
            console.log(`Backup creat: ${backupFile}`);
        }

        // Compile SCSS
        const result = sass.compile(inputPath, {
            style: 'compressed',
            loadPaths: [global.obGlobal.folderScss]
        });

        await fs.writeFile(outputPath, result.css);
        console.log(`Fișier compilat: ${inputPath} -> ${outputPath}`);

        return true;
    } catch (err) {
        console.error(`Eroare compilare SCSS: ${err.message}`);
        return false;
    }
}

async function initScss() {
    try {
        // Creează folderele necesare
        await fs.ensureDir(global.obGlobal.folderScss);
        await fs.ensureDir(global.obGlobal.folderCss);
        await fs.ensureDir(global.obGlobal.folderBackup);

        // Compilează fișierul principal pentru despre.ejs
        await compileazaScss('despre.scss', 'despre.css');

        // Monitorizare modificări
        const watcher = chokidar.watch(global.obGlobal.folderScss, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });

        watcher.on('change', async (path) => {
            if (path.endsWith('despre.scss')) {
                console.log(`Fișier modificat: ${path}`);
                await compileazaScss('despre.scss', 'despre.css');
            }
        });

        console.log('Monitorizare SCSS activă pentru despre.scss');
    } catch (err) {
        console.error('Eroare inițializare SCSS:', err);
    }
}


// Configurare
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

initErori();
initFoldere();
initScss().then(() => {
    app.listen(PORT, () => {
        console.log(`
        Serverul rulează pe portul ${PORT}
        Accesează: http://localhost:${PORT}
        `);
    });
});



app.use((req, res, next) => {
    // Verifică dacă URL-ul se termină cu .ejs
    if (req.url.toLowerCase().endsWith('.ejs')) {
        return afisareEroare(res, 400);
    }
    next();
});


// Middleware pentru /resurse
app.use("/resurse", (req, res, next) => {
    const caleCeruta = path.join(__dirname, "resurse", req.url);
    
    // Verificăm dacă cererea este pentru un director
    if (req.url.endsWith('/')) {
        fs.stat(caleCeruta, (err, stats) => {
            if (!err && stats.isDirectory()) {
                return afisareEroare(res, 403); // Director existent - 403 Forbidden
            }
            next(); // Nu este director sau nu există - continuă
        });
    } else {
        next(); // Este cerere pentru fișier - continuă
    }
});

// Servește fișiere statice cu gestionare de erori
app.use("/resurse", express.static(path.join(__dirname, "resurse"), (req, res, next) => {
    // Acest middleware se execută doar dacă express.static nu găsește fișierul
    afisareEroare(res, 404);
}));

// Restul rutelor rămân la fel...
app.get(["/", "/index", "/home"], (req, res) => {
    res.render("index", { 
        ip: req.ip,
        titlu: "SciMind - Pagina principală" 
    });
});


app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"));
});


app.use('/resurse', express.static('resurse'));



// Funcție pentru a afisa eroarea corespunzătoare
function afisareEroare(res, identificator, titlu, text, imagine) {
    const erori = obGlobal.obErori;
    let eroare;
    
    // Determină eroarea de afișat
    if (identificator) {
        eroare = erori.info_erori.find(e => e.identificator == identificator) || erori.eroare_default;
    } else {
        eroare = erori.eroare_default;
    }
    
    const status = eroare.status || 500;
    
    res.status(status).render("pagini/eroare", {
        titlu: titlu || eroare.titlu,
        text: text || eroare.text,
        imagine: imagine || eroare.imagine
    });
}

function getAnotimp(req) {
    let dataTest;
    if (req.query.data) {
      dataTest = new Date(req.query.data);
    } else {
      dataTest = new Date(); // data reală
    }
  
    const luna = dataTest.getMonth(); // 0-11
  
    if (luna >= 2 && luna <= 4) return "primavara";
    if (luna >= 5 && luna <= 7) return "vara";
    if (luna >= 8 && luna <= 10) return "toamna";
    return "iarna";
  }

  


// Încărcare date galerie cu verificare extinsă
let galerieData = { imagini: [], cale_galerie: "/resurse/imagini/galerie" };

try {
    const galeriePath = path.join(__dirname, "galerie.json");
    if (fs.existsSync(galeriePath)) {
        const rawData = fs.readFileSync(galeriePath, 'utf8');
        const parsedData = JSON.parse(rawData);

        // Validare structură date
        if (parsedData.imagini && Array.isArray(parsedData.imagini)) {
            galerieData = {
                imagini: parsedData.imagini,
                cale_galerie: parsedData.cale_galerie || "/resurse/imagini/galerie"
            };
        }
    } else {
        console.warn("Fișierul galerie.json nu există în directorul date/");
    }
} catch (err) {
    console.error("Eroare la încărcarea galeriei:", err);
}

// Ruta pentru galerie statica
app.get("/pagini/galerie_statica", (req, res) => {
    try {
        const anotimp = getAnotimp(req);
        const imagini = galerieData.imagini || [];
        
        // Filtrăm imaginile după anotimp și luăm primele 15
        const imaginiFiltrate = imagini
            .filter(img => img && img.anotimp === anotimp)
            .slice(0, 15); // 5 rânduri x 3 coloane = 15 imagini

        res.render("pagini/galerie_statica", {
            titlu: "Galerie Statică (5x3)",
            imagini: imaginiFiltrate,
            anotimpCurent: anotimp,
            caleGalerie: galerieData.cale_galerie
        });
    } catch (err) {
        console.error("Eroare la afișarea galeriei:", err);
        afisareEroare(res, 500);
    }
});


app.get("/pagini/galerie_animata", (req, res) => {
    try {
        // Încarcă datele din JSON folosind calea corectă
        const galerieData = require('./galerie.json');
        
        // Obținem toate imaginile din JSON
        const imagini = galerieData.imagini || [];

        // Trimite datele la template-ul EJS
        res.render("pagini/galerie_animata.ejs", {
            titlu: "Galerie Dinamică",
            imagini: imagini,
            caleGalerie: galerieData.cale_galerie || '/resurse/imagini'
        });
    } catch (err) {
        console.error("Eroare la afișarea galeriei:", err);
        res.status(500).send("Eroare la încărcarea galeriei");
    }
});









// Ruta generală pentru pagini dinamice
// Ruta principală pentru pagini
app.get("/pagini/:numePagina", (req, res) => {
    const numePagina = req.params.numePagina;
    const caleView = `pagini/${numePagina}`;
    
    // Verificăm dacă fișierul există
    const caleFisier = path.join(__dirname, 'views', caleView + '.ejs');

    
    
    fs.access(caleFisier, fs.constants.F_OK, (err) => {
        if (err) {
            afisareEroare(res, 404); // Folosește noua funcție
        } else {
            res.render(caleView, { 
                titlu: `SciMind - ${numePagina.replace(/-/g, ' ')}`
            });
        }
    });
});


console.log('__dirname:', __dirname);
console.log('__filename:', __filename);
console.log('process.cwd():', process.cwd());





// Pornire server
const PORT = 8080;

app.use((req, res) => {
    afisareEroare(res, 404);
});

app.listen(PORT, () => {
    console.log(`
    Serverul rulează pe portul ${PORT}
    Accesează: http://localhost:${PORT}
    `);
});
