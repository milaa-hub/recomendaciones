const selectorImagen = document.getElementById("imagen-file");
const vistaPrevia = document.getElementById("vista-previa");
const contenedorVistaPrevia = document.getElementById(
    "vista-previa-container"
);

let urlVistaPrevia = null;

selectorImagen.addEventListener("change", function () {
    const archivo = this.files[0];

    if (urlVistaPrevia) {
        URL.revokeObjectURL(urlVistaPrevia);
        urlVistaPrevia = null;
    }

    if (!archivo) {
        vistaPrevia.removeAttribute("src");
        contenedorVistaPrevia.hidden = true;
        return;
    }

    if (!archivo.type.startsWith("image/")) {
        alert("Seleccioná un archivo de imagen válido.");
        this.value = "";
        vistaPrevia.removeAttribute("src");
        contenedorVistaPrevia.hidden = true;
        return;
    }

    urlVistaPrevia = URL.createObjectURL(archivo);
    vistaPrevia.src = urlVistaPrevia;
    contenedorVistaPrevia.hidden = false;
});
