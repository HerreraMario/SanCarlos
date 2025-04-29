// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDeO300ZHcSaz3u5bzTQKX8w1Z73PHtNwE",
  authDomain: "controlacp-ebb07.firebaseapp.com",
  databaseURL: "https://controlacp-ebb07-default-rtdb.firebaseio.com",
  projectId: "controlacp-ebb07",
  storageBucket: "controlacp-ebb07.firebasestorage.app",
  messagingSenderId: "592369872670",
  appId: "1:592369872670:web:da68a68d8e1e3ab9cb230f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Referencia al nodo de usuarios
const usersRef = db.ref("SanCarlos/usuarios");

// Elementos del DOM
const residenceName = document.getElementById('residence-name');
const adminList = document.getElementById('admin-list');
const userList = document.getElementById('user-list');
const loginContainer = document.getElementById('login-container');
const adminNameInput = document.getElementById('admin-name');
const adminLoginButton = document.getElementById('admin-login-button');
const errorMessage = document.getElementById('error-message');

// Nombre principal
const displayName = "SanCarlos";
residenceName.textContent = `${displayName}`;

/**
 * Función para formatear una fecha en "DD/MM/YY HH:mm".
 * @param {Date} date – La fecha a formatear.
 * @returns {string} La fecha formateada.
 */
function formatTimestamp(date) {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear().toString().slice(-2);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${d}/${m}/${y} ${hh}:${mm}`;
}

/**
 * Muestra u oculta la tabla de fechas dentro de un bloque de usuario.
 * @param {HTMLElement} tableDiv - El contenedor (div) de la tabla de fechas.
 * @param {HTMLElement} toggleBtn - El botón que actúa como disparador.
 */
function toggleFechas(tableDiv, toggleBtn) {
  if (tableDiv.style.display === "none") {
    tableDiv.style.display = "block";
    toggleBtn.textContent = "Ocultar fechas";
  } else {
    tableDiv.style.display = "none";
    toggleBtn.textContent = "Mostrar fechas";
  }
}

/**
 * Renderiza la lista de administradores y usuarios en tiempo real.
 * Para cada usuario regular se crea un bloque que incluye:
 * - El nombre y botón para habilitar/inhabilitar.
 * - Un botón para mostrar/ocultar la tabla de registros almacenados en "fecha".
 * - La tabla (inicialmente oculta) con índices del 1 al 8.
 */
function mostrarUsuariosEnTiempoReal() {
  usersRef.on("value", snapshot => {
    // Reiniciamos el contenido
    adminList.innerHTML = '';
    userList.innerHTML = '';
    const usuarios = snapshot.val();
    let userIndex = 1;
    
    if (usuarios) {
      Object.keys(usuarios).forEach(name => {
        const usuario = usuarios[name];
        const div = document.createElement('div');
        div.className = "user-block";
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        
        // Para administradores:
        if (usuario.esAdmin) {
          userInfo.textContent = name; 
          div.appendChild(userInfo);
          adminList.appendChild(div);
        } else {
          // Para usuarios regulares:
          userInfo.textContent = `${userIndex}. ${name}`;
          userIndex++;
          
          // Botón para habilitar/inhabilitar la función "fase"
          const toggleBtnFase = document.createElement('button');
          toggleBtnFase.className = `toggle-btn ${usuario.fase ? '' : 'inactive'}`;
          toggleBtnFase.textContent = usuario.fase ? 'Inhabilitar' : 'Habilitar';
          toggleBtnFase.addEventListener('click', () => {
            usersRef.child(name).update({ fase: !usuario.fase });
          });
          div.appendChild(toggleBtnFase);
          
          // Botón para mostrar/ocultar la tabla de fechas
          const toggleBtnFechas = document.createElement('button');
          toggleBtnFechas.className = 'toggle-fechas-btn';
          toggleBtnFechas.textContent = "Mostrar fechas";
          
          // Contenedor para la tabla de fechas (inicialmente oculto)
          const fechasDiv = document.createElement('div');
          fechasDiv.style.display = "none";
          
          // Si existen registros en "fecha", se arma la tabla
          if (usuario.fecha) {
            const fechaTable = document.createElement('table');
            fechaTable.className = "fecha-table";
            
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const thIndex = document.createElement('th');
            thIndex.textContent = "Índice";
            const thFecha = document.createElement('th');
            thFecha.textContent = "Fecha y Hora";
            headerRow.appendChild(thIndex);
            headerRow.appendChild(thFecha);
            thead.appendChild(headerRow);
            fechaTable.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            // Se ordenan los índices numéricamente (del 1 al 8)
            const indices = Object.keys(usuario.fecha).sort((a, b) => Number(a) - Number(b));
            indices.forEach(idx => {
              const row = document.createElement('tr');
              const tdIndex = document.createElement('td');
              tdIndex.textContent = idx;
              const tdFecha = document.createElement('td');
              tdFecha.textContent = usuario.fecha[idx];
              row.appendChild(tdIndex);
              row.appendChild(tdFecha);
              tbody.appendChild(row);
            });
            fechaTable.appendChild(tbody);
            fechasDiv.appendChild(fechaTable);
          } else {
            const noFechas = document.createElement('p');
            noFechas.textContent = "No hay registros de fecha para este usuario.";
            fechasDiv.appendChild(noFechas);
          }
          
          // Agregamos el botón para mostrar/ocultar y su contenedor al bloque del usuario
          toggleBtnFechas.addEventListener('click', () => {
            toggleFechas(fechasDiv, toggleBtnFechas);
          });
          div.appendChild(toggleBtnFechas);
          div.appendChild(fechasDiv);
          
          div.appendChild(userInfo);
          userList.appendChild(div);
        }
      });
    } else {
      userList.textContent = 'No hay usuarios registrados.';
    }
  });
}

/**
 * Verifica los permisos del administrador en tiempo real.
 * Si el usuario pierde permisos o es eliminado, se cierra la sesión.
 */
function verificarPermisosAdminEnTiempoReal(adminName) {
  usersRef.child(adminName).on("value", snapshot => {
    const adminData = snapshot.val();
    if (!adminData || !adminData.esAdmin) {
      usersRef.child(adminName).once("value").then(snapshot => {
        if (snapshot.exists()) {
          usersRef.child(adminName).update({ sesionIniciada: false }).then(() => {
            alert("Tu cuenta ha sido deshabilitada o no tienes permisos. Se cerrará la sesión.");
            localStorage.removeItem("adminName");
            window.location.reload();
          }).catch(error => {
            console.error("Error al actualizar sesionIniciada a false:", error);
          });
        } else {
          console.warn(`El administrador ${adminName} ya no existe en Firebase. Se cerrará la sesión.`);
          localStorage.removeItem("adminName");
          window.location.reload();
        }
      }).catch(error => {
        console.error("Error al verificar la existencia del usuario en Firebase:", error);
      });
    }
  });
}

/**
 * Supervisa en tiempo real la eliminación de usuarios.
 */
usersRef.on("child_removed", snapshot => {
  const removedUser = snapshot.val();
  const storedUser = localStorage.getItem("adminName");
  if (storedUser && removedUser && storedUser === removedUser.nombre) {
    console.warn(`El usuario ${storedUser} ha sido eliminado de Firebase. Eliminando de localStorage...`);
    localStorage.removeItem("adminName");
    alert(`El usuario administrador '${storedUser}' ha sido eliminado y ya no podrá iniciar sesión.`);
    window.location.reload();
  }
});

/**
 * Iniciar sesión como administrador.
 */
adminLoginButton.addEventListener('click', () => {
  console.log("Botón de iniciar sesión clickeado");
  const adminName = adminNameInput.value.trim();
  if (!adminName) {
    errorMessage.textContent = 'Por favor, ingrese el nombre del administrador.';
    return;
  }
  
  // Verifica si el usuario existe y es administrador
  usersRef.child(adminName).once("value").then(snapshot => {
    const adminData = snapshot.val();
    if (adminData) {
      if (!adminData.esAdmin) {
        errorMessage.textContent = 'Tu cuenta no tiene permisos de administrador.';
      } else if (adminData.sesionIniciada) {
        errorMessage.textContent = 'El administrador ya tiene una sesión iniciada.';
      } else {
        usersRef.child(adminName).update({
          sesionIniciada: true
        }).then(() => {
          localStorage.setItem("adminName", adminName);
          console.log("Inicio de sesión exitoso");
          window.location.reload();
        }).catch(error => {
          console.error("Error al actualizar estado de sesión:", error);
        });
      }
    } else {
      errorMessage.textContent = 'El usuario no está registrado como administrador.';
    }
  }).catch(error => {
    console.error("Error al verificar administrador:", error);
  });
});

/**
 * Cargar sesión automáticamente si ya existe.
 */
window.addEventListener('load', () => {
  const storedAdminName = localStorage.getItem("adminName");
  if (storedAdminName) {
    usersRef.child(storedAdminName).once("value").then(snapshot => {
      const adminData = snapshot.val();
      if (adminData && adminData.esAdmin) {
        loginContainer.style.display = 'none';
        adminList.style.display = 'block';
        userList.style.display = 'block';
        mostrarUsuariosEnTiempoReal();
        verificarPermisosAdminEnTiempoReal(storedAdminName);
      } else {
        localStorage.removeItem("adminName");
      }
    }).catch(error => {
      console.error("Error al verificar el administrador guardado:", error);
    });
  }
});
