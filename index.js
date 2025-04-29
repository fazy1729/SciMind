const express = require("express");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const app = express();
global.obGlobal = {
    obErori: null
};

// Vectorul cu folderele necesare
const vect_foldere = ["temp"]; // Poți adăuga "temp1" pentru testare



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


// Configurare
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

initErori();
initFoldere();



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
