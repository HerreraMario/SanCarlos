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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias a la base de datos
const database = firebase.database();
const usersRef = database.ref("SanCarlos/usuarios");

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

// Supervisar permisos en tiempo real
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
          console.warn(`El administrador ${adminName} ya no existe en Firebase. No se realizará ninguna actualización.`);
          localStorage.removeItem("adminName");
          window.location.reload();
        }
      }).catch(error => {
        console.error("Error al verificar la existencia del usuario en Firebase:", error);
      });
    }
  });
}

// Supervisión en tiempo real de usuarios eliminados
usersRef.on("child_removed", snapshot => {
  const removedUser = snapshot.val();
  const storedUser = localStorage.getItem("adminName");

  if (storedUser && removedUser && storedUser === removedUser.nombre) {
    console.warn(`El usuario ${storedUser} ha sido eliminado de Firebase. Eliminando de localStorage...`);
    localStorage.removeItem("adminName");
    alert(`El usuario administrador '${storedUser}' ha sido eliminado y ya no podrá iniciar sesión.`);
    window.location.reload(); // Refrescar la página para eliminar la sesión
  }
});

// Mostrar usuarios en tiempo real
function mostrarUsuariosEnTiempoReal() {
  usersRef.on("value", snapshot => {
    adminList.innerHTML = '';
    userList.innerHTML = '';
    const usuarios = snapshot.val();
    let index = 1;

    if (usuarios) {
      Object.keys(usuarios).forEach(name => {
        const usuario = usuarios[name];
        const div = document.createElement('div');
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';

        usersRef.child(name).once("value").then(userSnapshot => {
          if (userSnapshot.exists()) {
            if (usuario.esAdmin) {
              userInfo.textContent = `${usuario.nombre}`;
              adminList.appendChild(div);
            } else {
              userInfo.textContent = `${index}. ${usuario.nombre}`;
              const toggleBtn = document.createElement('button');
              toggleBtn.className = `toggle-btn ${usuario.fase ? '' : 'inactive'}`;
              toggleBtn.textContent = usuario.fase ? 'Inhabilitar' : 'Habilitar';
              toggleBtn.addEventListener('click', () => {
                usersRef.child(name).update({ fase: !usuario.fase });
              });
              div.appendChild(toggleBtn);
              userList.appendChild(div);
              index++;
            }
            div.appendChild(userInfo);
          } else {
            console.warn(`El usuario ${name} ya no existe en Firebase. Ignorando...`);
          }
        }).catch(error => {
          console.error("Error al verificar usuario:", error);
        });
      });
    } else {
      userList.textContent = 'No hay usuarios registrados.';
    }
  });
}

// Iniciar sesión como administrador
adminLoginButton.addEventListener('click', () => {
  console.log("Botón de iniciar sesión clickeado"); // Mensaje para depuración
  const adminName = adminNameInput.value.trim();

  if (!adminName) {
    errorMessage.textContent = 'Por favor, ingrese el nombre del administrador.';
    return;
  }

  // Verificar existencia del usuario
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
          console.log("Inicio de sesión exitoso"); // Confirmación

          // Recargar la página para reflejar los cambios
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

// Cargar sesión automáticamente si ya existe
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
