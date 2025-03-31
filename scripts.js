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
const gateRef = database.ref("SanCarlos/led1");

// Variables y referencias
const condoName = "SanCarlos";
document.getElementById("condo-name").textContent = condoName;
const toggleButton = document.getElementById("toggle-button");
const nameInput = document.getElementById("name");
const registerButton = document.getElementById("register-button");
const infoText = document.getElementById("info-text");
const userNameDisplay = document.getElementById("user-name"); // Mostrará el nombre del usuario registrado
let currentUser = null;
let buttonPressed = false;
let gateOpenedInTime = false;
let gateTimeout = null;

// Mostrar el nombre del usuario registrado en la web
function showUserName(name) {
  userNameDisplay.textContent = name; // Solo muestra el nombre del usuario
  userNameDisplay.parentElement.classList.remove("hidden"); // Mostrar el contenedor del nombre
}

// Al cargar la página, verificar si el nombre en localStorage está en Firebase y compararlo
window.addEventListener("load", () => {
  const storedName = localStorage.getItem("userName");
  if (storedName) {
    usersRef.child(storedName).once("value").then(snapshot => {
      const usuario = snapshot.val();
      if (usuario) {
        if (usuario.nombre === storedName) {
          showUserName(storedName); // Mostrar el nombre en la interfaz
          checkUserInDatabase(storedName); // Verificar los permisos del usuario en la base de datos
        } else {
          console.warn("El nombre almacenado no coincide con el registrado en Firebase. Eliminando...");
          localStorage.removeItem("userName");
          document.getElementById("registro-container").classList.remove("hidden"); // Mostrar formulario de registro
        }
      } else {
        console.warn("Nombre no encontrado en Firebase. Eliminando de localStorage...");
        localStorage.removeItem("userName");
        document.getElementById("registro-container").classList.remove("hidden"); // Mostrar formulario de registro
      }
    }).catch(error => {
      console.error("Error al verificar el usuario en Firebase:", error);
    });
  } else {
    document.getElementById("registro-container").classList.remove("hidden");
  }
});

// Detectar eliminación de usuarios en Firebase y recargar la página
usersRef.on("child_removed", snapshot => {
  const removedUser = snapshot.val();
  const storedName = localStorage.getItem("userName");

  if (storedName && removedUser && storedName === removedUser.nombre) {
    console.warn(`El usuario ${storedName} ha sido eliminado de Firebase. Recargando página...`);
    localStorage.removeItem("userName");
    window.location.reload(); // Recargar la página
  } else {
    console.warn("Un usuario fue eliminado, pero no afecta al actual.");
  }
});

// Verificar el nombre del usuario en la base de datos
function checkUserInDatabase(name) {
  usersRef.child(name).once("value").then(snapshot => {
    const usuario = snapshot.val();
    if (usuario) {
      currentUser = usuario;

      if (usuario.fase) {
        toggleButton.disabled = false;
        toggleButton.classList.remove("hidden");
        document.getElementById("registro-container").classList.add("hidden"); // Ocultar formulario de registro
      } else {
        toggleButton.classList.remove("hidden");
        usersRef.child(name).on("value", snapshot => {
          const updatedUser = snapshot.val();
          if (updatedUser && updatedUser.fase) {
            toggleButton.disabled = false;
            toggleButton.classList.remove("hidden");
            document.getElementById("registro-container").classList.add("hidden");
            infoText.style.display = "none";
            currentUser = updatedUser;
          } else if (updatedUser && !updatedUser.fase) {
            toggleButton.disabled = true;
            infoText.style.display = "block";
            currentUser = updatedUser;
          }
        });
      }
    } else {
      document.getElementById("registro-container").classList.remove("hidden");
    }
  }).catch(error => {
    console.error("Error al verificar el registro del usuario:", error);
    document.getElementById("registro-container").classList.remove("hidden");
  });
}

// Registrar usuario y almacenar el nombre en localStorage
registerButton.addEventListener("click", () => {
  const name = nameInput.value.trim();

  if (name) {
    usersRef.child(name).once("value").then(snapshot => {
      const usuario = snapshot.val();
      if (usuario) {
        alert("El nombre ya está en uso. Por favor, elija otro nombre.");
      } else {
        usersRef.child(name).set({
          nombre: name,
          fase: false,
          esAdmin: false
        }).then(() => {
          localStorage.setItem("userName", name);
          showUserName(name);

          if (confirm("Usuario registrado con éxito.")) {
            document.getElementById("registro-container").classList.add("hidden");
            toggleButton.classList.remove("hidden");
            infoText.style.display = "block";

            usersRef.child(name).on("value", snapshot => {
              const updatedUser = snapshot.val();
              if (updatedUser && updatedUser.fase) {
                toggleButton.disabled = false;
                toggleButton.classList.remove("hidden");
                document.getElementById("registro-container").classList.add("hidden");
                infoText.style.display = "none";
                currentUser = updatedUser;
                location.reload();
              } else if (updatedUser && !updatedUser.fase) {
                toggleButton.disabled = true;
                infoText.style.display = "block";
                currentUser = updatedUser;
              }
            });
          }
        }).catch(error => {
          console.error("Error al registrar usuario:", error);
        });
      }
    });
  } else {
    alert("Por favor, completa el campo de nombre");
  }
});

// Monitorear cambios en la variable del portón
gateRef.on("value", snapshot => {
  const gateState = snapshot.val();
  if (buttonPressed) {
    if (gateState === 0) {
      clearTimeout(gateTimeout);
      toggleButton.disabled = false;
      buttonPressed = false;
    } else if (gateState === 1) {
      toggleButton.disabled = true;
      gateOpenedInTime = false;

      gateTimeout = setTimeout(() => {
        if (!gateOpenedInTime) {
          resetGateState();
          alert("El portón no se abrió a tiempo. Intenta nuevamente.");
        }
      }, 10000);
    }
  }
});

// Restablecer el estado del portón
function resetGateState() {
  gateRef.set(0).then(() => {
    console.log("Estado del portón restablecido");
    toggleButton.disabled = false;
    buttonPressed = false;
  }).catch(error => {
    console.error("Error al restablecer el estado del portón:", error);
  });
}

// Cambiar el estado del portón al hacer clic en el botón
toggleButton.addEventListener("click", () => {
  usersRef.child(currentUser.nombre).once("value").then(snapshot => {
    const currentUserData = snapshot.val();
    if (currentUserData && currentUserData.fase) {
      toggleButton.disabled = true;

      gateRef.once("value").then(snapshot => {
        const currentState = snapshot.val();
        gateRef.set(currentState === 1 ? 0 : 1).then(() => {
          console.log("Estado del portón actualizado en Firebase");
          clearTimeout(gateTimeout);
          gateOpenedInTime = false;
          buttonPressed = true;

          gateTimeout = setTimeout(() => {
            if (!gateOpenedInTime) {
              resetGateState();
              alert("El portón no se abrió a tiempo. Intenta nuevamente.");
            }
          }, 10000);
        }).catch(error => {
          console.error("Error al actualizar el estado del portón:", error);
        });
      });
    } else {
      alert("Usuario no habilitado.");
    }
  });
});
