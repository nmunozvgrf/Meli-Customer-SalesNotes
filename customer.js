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
              .replace(/Á/g, "A")
              .replace(/É/g, "E")
              .replace(/Í/g, "I")
              .replace(/Ó/g, "O")
              .replace(/Ú/g, "U")
              .replace(/Ñ/g, "N")
              .replace(/ /g, "%20");
}

function validEmail(email){
  if (!email || typeof email !== "string" || !email.includes("@")){
    return "email_invalido@dominio.com";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) ? email.trim() : "email_invalido@dominio.com";
}

async function obtenerClientes() {
  try {
    const accessToken = await obtenerTokenComprador();
    const userIdComprador = await obtenerUserIdComprador(); // Obtener el userId correctamente
    
    if (!accessToken) {
      console.error("No se pudo obtener el token de acceso del comprador.");
      return null;
    }

    if (!userIdComprador) {
      console.error("No se pudo obtener el user_id del comprador.");
      return null;
    }

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const url = `https://api.mercadolibre.com/users/${userIdComprador}`;

    try {
      const { data } = await axios.get(url, { headers });

      const fechaCreacion = data.registration_date
        ? data.registration_date.split('T')[0].split('-').reverse().join('')
        : "Fecha NO Disponible";

      const Datos = {
        Id_Comprador: data.id || 'Sin Id Comprador',
        Rut: (data.identification?.number || 'Sin Rut').replace(/-/g, ''), 
        Nombre: changeText(data.nickname || 'Sin Nombre'),
        Direccion: changeText(data.address?.address || 'Sin Dirección'),
        Ciudad: changeText(data.address?.city || 'Sin Ciudad'),
        Comuna: changeText(data.address?.state || 'Sin Comuna'),
        Email: validEmail(data.email || 'Sin Email'),
        Fecha_Creacion: fechaCreacion,
        Telefono: data.phone?.number || 'Sin Teléfono',
      };

      //console.log(`Datos Cliente:`, Datos);

      const esValido = isValidCustomer(Datos.Rut);
      if (esValido === 0) { 
        console.log(`Cliente no existe. Creándolo...`);
        createCustomer(Datos);
      } else if (esValido === 1) {
        console.log(`Cliente ya existe. No se creará.`);
      }

      return Datos; // Devolver los datos aquí
    } catch (error) {
      console.error("Error obteniendo los envíos:", error.message);
      return null;
    }
  } catch (error) {
    console.error("Error en obtenerClientes:", error.message);
    return null;
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

// Crea el usuario
function createCustomer(Datos) {
  const Email = validEmail(Datos.Email);
  
  const comandoCrear = `sh /data/create_customer.sh "${Datos.Rut}|${Datos.Nombre}|${Datos.Direccion}|${Datos.Comuna}|${Datos.Ciudad}|${giro}|${Datos.Telefono}|${Datos.Telefono}|${Datos.Telefono}|${Datos.Nombre}|${tipo_Usuario}|${Datos.Fecha_Creacion}|${Datos.Fecha_Creacion}|${numero1}|${numero2}|${numero3}|${numero4}|${Datos.Telefono}|${Email}"`;
  
  console.log("Verificando creación del cliente...");
  
  let salidaCrear = shell.exec(comandoCrear, { silent: true });
  if (!salidaCrear || salidaCrear.code !== 0) {
    console.error('Error: Creación fallida.');
    console.error('Salida del script:', salidaCrear.stderr || salidaCrear.stdout);
    return false;
  }

  console.log(`Cliente ${Datos.Rut} creado correctamente.`);
  return true;
}

async function obtenerDatos() {
  const datosCliente = await obtenerClientes();

  if (datosCliente) {
   
    // Aquí se combinan los datos y las variables adicionales
    const datosCombinados = {
      Datos: datosCliente,
      tipo_Usuario,
      giro,
      numero1,
      numero2,
      numero3,
      numero4
    };

    return datosCombinados;
  } else {
    
    console.log("No se pudieron obtener los datos del cliente.");
    return null;
  }
}

module.exports = { obtenerClientes, isValidCustomer, createCustomer, obtenerDatos};
