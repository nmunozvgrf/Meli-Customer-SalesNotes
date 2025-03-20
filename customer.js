const axios = require('axios');
const fs = require('fs');
const shell = require('shelljs');
const { obtenerTokenComprador, obtenerUserIdComprador } = require("./token");


const tipo_Usuario = 'MM';
const giro = 'PA';
const numero1 = '0';
const numero2 = '0';
const numero3 = '1';
const numero4 = '0';



// Reemplazo para convertir a mayúsculas y normalizar
function changeText(texto){
  if (!texto) return "Sin Datos";
  return texto.toUpperCase()
              .replace("Á","A")
              .replace("É","E")
              .replace("Í","I")
              .replace("Ó","O")
              .replace("Ú","U")
              .replace("Ñ","N")
              .replace(" ","%20");
}

function validEmail(email){
  if (!email || typeof email !== "string" || !email.includes ("@")){
    return "email_invalido@dominio.com"
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim())? email.trim(): "email_invalido@dominio.com";
}

async function obtenerClientes() {
  try {
    const accessToken = await obtenerTokenComprador();
    const userIdComprador = obtenerUserIdComprador();

    if (!accessToken) {
      console.error("No se pudo obtener el token de acceso del comprador.");
      return;
    }

    if (!userIdComprador) {
      console.error("No se pudo obtener el user_id del comprador.");
      return;
    }

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const url = `https://api.mercadolibre.com/users/${userIdComprador}`;
    try {
      const { data } = await axios.get(url, { headers });

      const fechaCreacion = data.registration_date? data.registration_date.split('T')[0].split('-').reverse().join(''): "Fecha NO Disponible";


      const Datos = {
        Rut: (data.identification?.number || 'Sin Rut').replace(/-/g, ''), 
        Nombre: changeText(data.nickname || 'Sin Nombre'),
        Direccion: changeText(data.address?.address || 'Sin Dirección'),
        Ciudad: changeText(data.address?.city || 'Sin Ciudad'),
        Comuna: changeText(data.address?.state || 'Sin Comuna'),
        Email:  validEmail(data.email || 'Sin Email'),
        Fecha_Creacion: fechaCreacion,
        Telefono: data.phone?.number || 'Sin Teléfono',
      };

      console.log('Datos del cliente:', Datos);

      const esValido = isValidCustomer(Datos.Rut);
      if (esValido === 0) { 
        console.log(`Cliente no existe. Creándolo...`);
        createCustomer(Datos);
      } else if (esValido === 1) {
        console.log(`Cliente ya existe. No se creará.`);
      }
      
    } catch (error) {
      console.error(`Error al obtener datos del comprador (${userIdComprador}):`, error.response?.data || error.message);
    }
  } catch (error) {
    console.error("Error obteniendo los envíos:", error.message);
  }
}


// Valida la existencia del usuario
function isValidCustomer(rut) {
  if (!rut || rut === 'Sin Rut') {
    console.log(`Cliente sin RUT encontrado. Retornando null.`);
    return null;
  }

  const comandoValidar = `sh /data/valid_customer.sh ${rut}`;
  let salidaValidar = shell.exec(comandoValidar, { silent: true });

  if (!salidaValidar || salidaValidar.code !== 0) {
    console.log('Cliente no está registrado: 0.');
    return 0;
  }

  const status = salidaValidar.stdout.trim();
  const isValid = status === '1' ? 1 : 0;
  console.log(`Cliente validado: ${isValid}`);
  return isValid;
}

//Crea el usuario
function createCustomer(Datos) {

  Email = validEmail(Datos.Email);
  
  const comandoCrear = `sh /data/create_customer.sh "${Datos.Rut}|${Datos.Nombre}|${Datos.Direccion}|${Datos.Comuna}|${Datos.Ciudad}|${giro}|${Datos.Telefono}|${Datos.Telefono}|${Datos.Telefono}|${Datos.Nombre}|${tipo_Usuario}|${Datos.Fecha_Creacion}|${Datos.Fecha_Creacion}|${numero1}|${numero2}|${numero3}|${numero4}|${Datos.Telefono}|${Email}"`;
  
  // Mensaje en la terminal antes de ejecutar el script
  console.log(" Verificando creación del cliente...");
  
  let salidaCrear = shell.exec(comandoCrear, { silent: true });
  if (!salidaCrear || salidaCrear.code !== 0) {
    console.error('Error: Creación fallida.');
    console.error('Salida del script:', salidaCrear.stderr || salidaCrear.stdout);
    return false;
  }

  console.log(`Cliente ${Datos.Rut} creado correctamente.`);
  return true;
}

module.exports = { obtenerClientes, isValidCustomer, createCustomer, tipo_Usuario, giro, numero1, numero2, numero3, numero4};

