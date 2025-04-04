const axios = require("axios");
const shell = require('shelljs');
const { obtenerTokenVendedor } = require("./token"); 
const { obtenerDatos } = require("./customer");

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

const nulo = 'null';
const blanco = '';
const cero = '0';
const uno = '1';
const sucursal = '3';
const numeroE = '7555';
const numeroF = '1435';
const ceroUno = '01';
const numeroD = '20241211';
const once = '11';
const nuloCero = 'nullnull0';
const nullZero = 'nullnull00null';

function changeText(texto) {
  if (!texto) return "Sin Datos";
  return texto.toUpperCase().replace(/ /g, "%20");
}

async function getNumber() {
  try {
    const output = shell.exec(`sh /data/getnumber_order.sh`, { silent: true });

    if (output.code !== 0) {
      throw new Error(`Error ejecutando el script: ${output.stderr}`);
    }

    const result = output.stdout.trim();

    if (!result) {
      throw new Error("El script no devolvió un número válido.");
    }

    return result;
  } catch (error) {
    console.error("Error ejecutando el script para obtener el número de orden:", error.message);
    return null;
  }
}

// Obtener pedidos pagados
async function obtenerPedidos() {
  try {
    const accessToken = await obtenerTokenVendedor();

    if (!accessToken) {
      throw new Error("No se pudo obtener el token de acceso del vendedor.");
    }

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const { data } = await axios.get(URL, { headers });

    const pedidos = data.results.map((order) => {
      const fechaObj = new Date(order.date_created);
      const Fecha = `${fechaObj.getDate().toString().padStart(2, '0')}${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}${fechaObj.getFullYear()}`;
      const Hora = `${fechaObj.getHours().toString().padStart(2, '0')}:${fechaObj.getMinutes().toString().padStart(2, '0')}`;

      return {
        Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
        Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
        Fecha,
        Hora,
        Sku: changeText(order.order_items?.[0]?.item?.seller_sku || "No Especificado"),
        Pago: order.paid_amount || "0",
        BuyerID: order.buyer?.id || "Sin ID",
      };
    });

    return pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

// Crear nota de venta
async function createOrder() {
  const pedidos = await obtenerPedidos();
  const datosCombinados = await obtenerDatos();

  if (!datosCombinados || !datosCombinados.Datos) {
    console.error("Error: No se pudieron obtener los datos combinados.");
    return false;
  }

  if (pedidos.length === 0) {
    console.log("No hay pedidos para procesar.");
    return false;
  }

  for (const pedido of pedidos) {
    // Validación de coincidencia de IDs
    if (pedido.BuyerID !== datosCombinados.Datos.Id_Comprador) {
      console.log(`Pedido ignorado: ID comprador no coincide (${pedido.BuyerID} ≠ ${datosCombinados.Datos.Id_Comprador}).`);
      continue;
    }

    // Solo si los IDs coinciden, se obtiene el número
    const numeroOrden = await getNumber();
    if (!numeroOrden) {
      console.error(`No se pudo obtener el número de orden para BuyerID: ${pedido.BuyerID}`);
      continue;
    }

    const comandoCrear = `sh /data/create_order.sh "${numeroOrden};${datosCombinados.Datos.fecha_Creacion};${datosCombinados.Datos.Rut};${datosCombinados.Datos.Nombre};${datosCombinados.Datos.Direccion};${datosCombinados.Datos.Ciudad};${datosCombinados.Datos.Telefono};${datosCombinados.Datos.Telefono};${datosCombinados.giro};${nulo};${pedido.Pago};${cero};${cero};${pedido.Pago};${uno};${datosCombinados.tipo_Usuario};${once};${datosCombinados.tipo_Usuario};${blanco};${blanco};${once};${nuloCero};${blanco};${datosCombinados.Datos.hora};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${datosCombinados.Datos.Email};${nulo};${numeroD};${blanco};${blanco};${numeroE};${ceroUno};${uno};${numeroF};${cero};${nullZero}|${numeroOrden};${ceroUno};${pedido.Sku};${sucursal};${pedido.Cantidad};${numeroE};${cero};${pedido.Fecha};${pedido.Hora};${pedido.Precio}"`;

    console.log("Comando a ejecutar:", comandoCrear);

    let salidaCrear = shell.exec(comandoCrear, { silent: true });
    if (!salidaCrear || salidaCrear.code !== 0) {
      console.error('Error: Creación fallida.');
      console.error('Salida del script:', salidaCrear.stderr || salidaCrear.stdout);
      return false;
    }

    console.log(`Nota de venta para la orden ${numeroOrden} creada correctamente.`);
  }

  return true;
}

module.exports = { obtenerPedidos, createOrder };
