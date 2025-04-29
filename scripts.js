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

// Variables y referencias de la interfaz
const condoName = "SanCarlos";
document.getElementById("condo-name").textContent = condoName;
const toggleButton = document.getElementById("toggle-button");
const nameInput = document.getElementById("name");
const registerButton = document.getElementById("register-button");
const infoText = document.getElementById("info-text");
const userNameDisplay = document.getElementById("user-name"); // Contenedor para el nombre del usuario

let currentUser = null;
let buttonPressed = false;
let gateOpenedInTime = false;
let gateTimeout = null;

// Variable para marcar el inicio de la operación
let operationStartTime = null;

/**
 * Formatea una fecha en formato "DD/MM/YY HH:mm".
 * @param {Date} date - La fecha a formatear.
 * @returns {string} La fecha formateada.
 */
const formatTimestamp = (date) => {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear().toString().slice(-2);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${d}/${m}/${y} ${hh}:${mm}`;
};

/**
 * Registra la operación efectiva (cuando el portón vuelve a 0 en el tiempo permitido),
 * guardando la fecha con formato resumido en el nodo "fecha" del usuario.
 *
 * Se almacenan los registros numerados del 1 al 8.  
 * Si hay menos de 8 registros, se añade en la siguiente posición;  
 * si ya hay 8, se elimina el registro en el índice 1, se desplazan los demás
 * (2 pasa a ser 1, ... , 8 pasa a ser 7) y se coloca el nuevo registro en la posición 8.
 * 
 * @param {string} userName - Nombre del usuario.
 * @param {Date} fecha - Fecha y hora de la operación efectiva.
 */
const recordEffectiveDate = async (userName, fecha) => {
  try {
    const formattedDate = formatTimestamp(fecha);
    const fechaRef = usersRef.child(userName).child("fecha");
    const snapshot = await fechaRef.once("value");
    const data = snapshot.val() || {}; // Registros actuales
    // Convertir las keys a números y ordenarlas
    let keys = Object.keys(data).map(Number).sort((a, b) => a - b);
    
    if (keys.length < 8) {
      // Añadir en el siguiente índice (empleamos 1-indexado)
      const newIndex = keys.length + 1;
      await fechaRef.child(newIndex).set(formattedDate);
      console.log(`Registro guardado en índice ${newIndex}: ${formattedDate} para el usuario ${userName}`);
    } else {
      // Se han alcanzado 8 registros, entonces se elimina el registro 1 y se reindexan
      for (let i = 2; i <= 8; i++) {
        await fechaRef.child(i - 1).set(data[i]);
      }
      await fechaRef.child(8).set(formattedDate);
      console.log(`Registro actualizado en índice 8: ${formattedDate} para el usuario ${userName}`);
    }
  } catch (error) {
    console.error("Error al registrar la fecha efectiva:", error);
  }
};

/**
 * Muestra el nombre del usuario en la interfaz.
 * @param {string} name - El nombre del usuario.
 */
const showUserName = (name) => {
  userNameDisplay.textContent = name;
  userNameDisplay.parentElement.classList.remove("hidden");
};

/**
 * Obtiene los datos del usuario desde Firebase.
 * @param {string} name - El nombre del usuario.
 * @returns {Promise<Object|null>} Los datos del usuario o null en caso de error.
 */
const getUserData = async (name) => {
  try {
    const snapshot = await usersRef.child(name).once("value");
    return snapshot.val();
  } catch (error) {
    console.error("Error al obtener datos del usuario:", error);
    return null;
  }
};

/**
 * Suscribe la escucha de cambios para el usuario especificado.
 * @param {string} name - El nombre del usuario.
 */
const subscribeUserChanges = (name) => {
  usersRef.child(name).on("value", (snapshot) => {
    const updatedUser = snapshot.val();
    if (updatedUser) {
      // Agregamos la propiedad "nombre" usando el key
      currentUser = {...updatedUser, nombre: name};
      updateUserUI(updatedUser);
    }
  });
};

/**
 * Actualiza la interfaz de usuario según el estado del usuario.
 * @param {Object} userData - Datos del usuario.
 */
const updateUserUI = (userData) => {
  if (userData.fase) {
    toggleButton.disabled = false;
    toggleButton.classList.remove("hidden");
    document.getElementById("registro-container").classList.add("hidden");
    infoText.style.display = "none";
  } else {
    toggleButton.disabled = true;
    infoText.style.display = "block";
  }
};

/**
 * Establece o reinicia el temporizador para comprobar el estado del portón.
 */
const setGateTimeout = () => {
  clearTimeout(gateTimeout);
  gateOpenedInTime = false;
  gateTimeout = setTimeout(() => {
    if (!gateOpenedInTime) {
      resetGateState();
      alert("El portón no se abrió a tiempo. Intenta nuevamente.");
    }
  }, 10000);
};

/**
 * Restablece el estado del portón a 0.
 */
const resetGateState = async () => {
  try {
    await gateRef.set(0);
    console.log("Estado del portón restablecido");
    toggleButton.disabled = false;
    buttonPressed = false;
  } catch (error) {
    console.error("Error al restablecer el estado del portón:", error);
  }
};

/**
 * Al cargar la página, se verifica si hay un usuario almacenado.
 */
window.addEventListener("load", async () => {
  const storedName = localStorage.getItem("userName");
  if (storedName) {
    const usuario = await getUserData(storedName);
    if (usuario) {
      // Asignamos el nombre obtenido del key al objeto currentUser
      currentUser = {...usuario, nombre: storedName};
      showUserName(storedName);
      subscribeUserChanges(storedName);
    } else {
      console.warn("No existe el usuario en Firebase.");
      localStorage.removeItem("userName");
      document.getElementById("registro-container").classList.remove("hidden");
    }
  } else {
    document.getElementById("registro-container").classList.remove("hidden");
  }
});

/**
 * Monitoriza la eliminación de usuarios en Firebase.
 */
usersRef.on("child_removed", (snapshot) => {
  const removedUser = snapshot.val();
  const storedName = localStorage.getItem("userName");
  if (storedName && removedUser && storedName === removedUser.nombre) {
    console.warn(`El usuario ${storedName} ha sido eliminado de Firebase. Recargando página...`);
    localStorage.removeItem("userName");
    window.location.reload();
  } else {
    console.warn("Un usuario fue eliminado, pero no afecta al actual.");
  }
});

/**
 * Maneja el registro del usuario.
 */
registerButton.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) {
    alert("Por favor, completa el campo de nombre");
    return;
  }
  try {
    const snapshot = await usersRef.child(name).once("value");
    const usuario = snapshot.val();
    if (usuario) {
      alert("El nombre ya está en uso. Por favor, elija otro nombre.");
      return;
    }
    // Registrar Nuevo usuario sin repetir el nombre en el objeto
    await usersRef.child(name).set({
      fase: false,
      esAdmin: false
    });
    localStorage.setItem("userName", name);
    currentUser = {fase: false, esAdmin: false, nombre: name}; // Asigna el nombre localmente
    showUserName(name);
    if (confirm("Usuario registrado con éxito.")) {
      document.getElementById("registro-container").classList.add("hidden");
      toggleButton.classList.remove("hidden");
      infoText.style.display = "block";
      subscribeUserChanges(name);
    }
  } catch (error) {
    console.error("Error al registrar usuario:", error);
  }
});

/**
 * Monitoriza los cambios en el estado del portón.
 * Cuando el portón vuelve a 0 tras haberse activado (1),
 * se verifica que el retorno haya ocurrido dentro de 10 segundos
 * y se registra la operación efectiva (la fecha se almacena en el nodo "fecha").
 */
gateRef.on("value", (snapshot) => {
  const gateState = snapshot.val();
  if (buttonPressed) {
    if (gateState === 0) {
      if (operationStartTime) {
        const elapsed = new Date() - operationStartTime;
        if (elapsed <= 10000) { // Operación efectiva si es en 10 segundos o menos
          recordEffectiveDate(currentUser.nombre, new Date());
          console.log(`Operación efectiva registrada para ${currentUser.nombre} a las ${formatTimestamp(new Date())}`);
        }
        operationStartTime = null;
      }
      clearTimeout(gateTimeout);
      toggleButton.disabled = false;
      buttonPressed = false;
    } else if (gateState === 1) {
      toggleButton.disabled = true;
      gateOpenedInTime = false;
      setGateTimeout();
    }
  }
});

/**
 * Maneja el evento al hacer clic en el botón para cambiar el estado del portón.
 * Se registra el instante inicial para verificar el tiempo de retorno.
 */
toggleButton.addEventListener("click", async () => {
  try {
    const userSnapshot = await usersRef.child(currentUser.nombre).once("value");
    const currentUserData = userSnapshot.val();
    if (currentUserData && currentUserData.fase !== undefined ? currentUserData.fase : true) {
      toggleButton.disabled = true;
      const gateSnapshot = await gateRef.once("value");
      const currentState = gateSnapshot.val();
      // Cambiar el estado del portón: si es 1 se pone en 0 y viceversa
      await gateRef.set(currentState === 1 ? 0 : 1);
      console.log("Estado del portón actualizado en Firebase");
      
      // Registrar el instante de inicio de la operación
      operationStartTime = new Date();
      
      clearTimeout(gateTimeout);
      buttonPressed = true;
      setGateTimeout();
    } else {
      alert("Usuario no habilitado.");
    }
  } catch (error) {
    console.error("Error al cambiar el estado del portón:", error);
  }
});
