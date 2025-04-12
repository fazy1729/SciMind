const express = require("express");
const path = require("path");
const app = express();

// Configurare
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Resurse statice
app.use("/resurse", express.static(path.join(__dirname, "resurse")));

// Rute
app.get("/", (req, res) => {
    res.render("index", { 
        ip: req.ip,
        titlu: "SciMind - Pagina principală" 
    });
});

app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"));
});

// 404 - Trebuie să fie ultima rută!
app.use((req, res) => {
    res.status(404).render("pagini/eroare", {
        titlu: "Pagina nu există",
        text: "Rețeaua neuronală nu a putut găsi resursa cerută.",
        imagine: "/resurse/imagini/eroare/404.jpg"
    });
});

// Pornire
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`
    Serverul rulează pe portul ${PORT}
    Accesează: http://localhost:${PORT}
    `);
});