const formulario = document.getElementById('form-serie');

const selectorImagen = document.getElementById('imagen-file');
const vistaPrevia = document.getElementById('vista-previa');
const contenedorVistaPrevia = document.getElementById(
    'vista-previa-container'
);

const mensaje = document.getElementById('mensaje-formulario');
const botonEnviar = formulario.querySelector(
    'button[type="submit"]'
);

let urlVistaPrevia = null;

// ========================================
// 1. VISTA PREVIA ORIGINAL DE LA IMAGEN
// ========================================

selectorImagen.addEventListener('change', function () {
    const archivo = this.files[0];

    if (urlVistaPrevia) {
        URL.revokeObjectURL(urlVistaPrevia);
        urlVistaPrevia = null;
    }

    if (!archivo) {
        vistaPrevia.removeAttribute('src');
        contenedorVistaPrevia.hidden = true;
        return;
    }

    if (!archivo.type.startsWith('image/')) {
        alert('Seleccioná un archivo de imagen válido.');

        this.value = '';
        vistaPrevia.removeAttribute('src');
        contenedorVistaPrevia.hidden = true;
        return;
    }

    urlVistaPrevia = URL.createObjectURL(archivo);
    vistaPrevia.src = urlVistaPrevia;
    contenedorVistaPrevia.hidden = false;
});

// ========================================
// 2. MENSAJES DEL FORMULARIO
// ========================================

function mostrarMensaje(texto, esError = false) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
    mensaje.style.color = esError ? '#dc2626' : '#15803d';
}

// ========================================
// 3. CAPTURAR Y GUARDAR LA RECOMENDACIÓN
// ========================================

formulario.addEventListener('submit', async function (e) {
    e.preventDefault();

    botonEnviar.disabled = true;
    botonEnviar.textContent = 'Publicando...';
    mensaje.hidden = true;

    let imagenSubida = false;
    let nombreArchivo = null;

    try {
        // Capturar los campos del formulario
        const titulo = document.getElementById('titulo').value.trim();
        const tipo = document.getElementById('tipo').value;
        const genero = document.getElementById('genero').value;

        const puntuacion = Number(
            document.getElementById('puntuacion').value
        );

        const resena = document.getElementById('resena').value.trim();
        const motivo = document.getElementById('motivo').value.trim();

        const plataforma =
            document.getElementById('plataforma').value;

        const anio =
            document.getElementById('anio').value;

        const fecha =
            document.getElementById('fecha').value;

        const recomendacionGeneral =
            document.getElementById('recomendacion-general').checked;

        const archivo = selectorImagen.files[0];

        // Comprobar los campos obligatorios
        if (!titulo || !tipo || !genero || !resena || !motivo) {
            throw new Error('Completá todos los campos obligatorios.');
        }

        if (!Number.isInteger(puntuacion) ||
            puntuacion < 1 || puntuacion > 5) {
            throw new Error('La puntuación debe estar entre 1 y 5.');
        }

        // ========================================
        // 4. SUBIR LA IMAGEN A SUPABASE STORAGE
        // ========================================

        let imagenUrl = null;

        if (archivo) {
            if (!archivo.type.startsWith('image/')) {
                throw new Error('Seleccioná una imagen válida.');
            }

            if (archivo.size > 5 * 1024 * 1024) {
                throw new Error('La imagen no puede superar los 5 MB.');
            }

            const extension = archivo.name.split('.').pop();

            nombreArchivo =
                `${Date.now()}_${crypto.randomUUID()}.${extension}`;

            const { error: errorImagen } = await window.supabase
                .storage
                .from('portadas')
                .upload(nombreArchivo, archivo, {
                    contentType: archivo.type,
                    upsert: false
                });

            if (errorImagen) {
                throw new Error(
                    'Error al subir la imagen: ' + errorImagen.message
                );
            }

            imagenSubida = true;

            const { data: urlData } = window.supabase
                .storage
                .from('portadas')
                .getPublicUrl(nombreArchivo);

            imagenUrl = urlData.publicUrl;
        }

        // ========================================
        // 5. ARMAR EL OBJETO PARA LA TABLA
        // ========================================

        // La tabla actual tiene una columna "descripcion".
        // Por eso reunimos allí la reseña y los datos adicionales.

        let descripcion = `Reseña: ${resena}

¿Por qué la recomiendo?: ${motivo}`;

        if (plataforma) {
            descripcion += `\nPlataforma: ${plataforma}`;
        }

        if (anio) {
            descripcion += `\nAño de estreno: ${anio}`;
        }

        if (fecha) {
            descripcion += `\nFecha de recomendación: ${fecha}`;
        }

        descripcion += recomendacionGeneral
            ? '\nLa recomendaría a cualquier persona: Sí'
            : '\nLa recomendaría a cualquier persona: No';

        const nuevaRecomendacion = {
            titulo: titulo,
            tipo: tipo,
            genero: genero,
            descripcion: descripcion,
            imagen_url: imagenUrl,
            puntuacion: puntuacion
        };

        // ========================================
        // 6. INSERTAR EN SUPABASE
        // ========================================

        const { error } = await window.supabase
            .from('recomendaciones')
            .insert([nuevaRecomendacion]);

        if (error) {
            throw new Error(
                'Error al guardar en Supabase: ' + error.message
            );
        }
        await cargarSeries();
        // ========================================
        // 7. CONFIRMAR Y LIMPIAR EL FORMULARIO
        // ========================================

        mostrarMensaje('¡Recomendación publicada correctamente!');

        formulario.reset();

        vistaPrevia.removeAttribute('src');
        contenedorVistaPrevia.hidden = true;

        if (urlVistaPrevia) {
            URL.revokeObjectURL(urlVistaPrevia);
            urlVistaPrevia = null;
        }

    } catch (error) {
        console.error('Error al publicar:', error);

        mostrarMensaje(error.message || 'Ocurrió un error al publicar.', true);

        // Si se subió la imagen pero falló el registro,
        // intentamos eliminar el archivo para evitar dejarlo huérfano.
        if (imagenSubida && nombreArchivo) {
            const { error: errorEliminar } = await window.supabase
                .storage
                .from('portadas')
                .remove([nombreArchivo]);

            if (errorEliminar) {
                console.error(
                    'No se pudo eliminar la imagen subida:',
                    errorEliminar.message
                );
            }
        }

    } finally {
        botonEnviar.disabled = false;
        botonEnviar.textContent = 'Publicar recomendación →';
    }
});


 // ========================================
 // 8. CARGAR EL CATÁLOGO DE RECOMENDACIONES
 // ========================================

async function cargarSeries() {
    const catalogo = document.getElementById('grid-series');

    if (!catalogo) {
        console.error('No se encontró el contenedor #grid-series.');
        return;
    }

    catalogo.innerHTML = '<p>Cargando recomendaciones...</p>';

    try {
        const { data, error } = await window.supabase
            .from('recomendaciones')
            .select('*');

        if (error) {
            throw error;
        }

        catalogo.innerHTML = '';

        if (!data || data.length === 0) {
            catalogo.innerHTML =
                '<p>Todavía no hay recomendaciones publicadas.</p>';
            return;
        }

        data.forEach(function (serie) {
            const tarjeta = document.createElement('article');
            tarjeta.className = 'card-serie';

            if (serie.imagen_url) {
                const imagen = document.createElement('img');
                imagen.src = serie.imagen_url;
                imagen.alt = 'Portada de ' + serie.titulo;
                imagen.className = 'imagen-serie';
                imagen.loading = 'lazy';

                tarjeta.appendChild(imagen);
            }

            const titulo = document.createElement('h3');
            titulo.textContent = serie.titulo || 'Sin título';
            tarjeta.appendChild(titulo);

            const tipo = document.createElement('p');
            tipo.textContent = 'Tipo: ' + (serie.tipo || 'No especificado');
            tarjeta.appendChild(tipo);

            const genero = document.createElement('p');
            genero.textContent = 'Género: ' + (serie.genero || 'No especificado');
            tarjeta.appendChild(genero);

            const puntuacion = document.createElement('p');
            puntuacion.textContent =
                'Puntuación: ' + (serie.puntuacion ?? 'Sin puntuación') + '/5';
            tarjeta.appendChild(puntuacion);

            const descripcion = document.createElement('p');
            descripcion.textContent =
                serie.descripcion || 'Sin descripción';
            tarjeta.appendChild(descripcion);

            catalogo.appendChild(tarjeta);
        });

    } catch (error) {
        console.error('Error al cargar el catálogo:', error);
        catalogo.innerHTML =
            '<p>No se pudieron cargar las recomendaciones. Revisá la consola.</p>';
    }
}

// Ejecutar la carga cuando la página esté lista.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarSeries);
} else {
    cargarSeries();
}
