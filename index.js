const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
global.obGlobal = {
    obErori: null
};

function initErori() {
    const eroriRaw = fs.readFileSync("erori.json");
    const eroriJson = JSON.parse(eroriRaw);

    eroriJson.info_erori.forEach(eroare => {
        eroare.imagine = path.join(eroriJson.cale_baza, eroare.imagine);
    });

    eroriJson.eroare_default.imagine = path.join(eroriJson.cale_baza, eroriJson.eroare_default.imagine);
    obGlobal.obErori = eroriJson;
}

// Configurare
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

initErori();

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
