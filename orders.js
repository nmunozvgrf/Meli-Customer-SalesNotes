const axios = require("axios");
const { obtenerTokenVendedor } = require("./token"); 
const { obtenerDatos } = require("./customer");
const shell = require('shelljs');

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

const nulo = 'null';
const blanco = ' ';
const cero = '0';
const uno= '1';
const dos ='2';
const sucursal ='3';
const number='8990';
const number2 ='7555';
const number3 ='1435';
const once ='11';
const cerouno ='01';
const cerodos ='02';


function getNumber() {
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

// Función para comparar y unir datos si los IDs coinciden
async function compararYUnirDatos(order) {
  try {
    const datosCliente = await obtenerDatos();

    if (!datosCliente || !datosCliente.Datos || !datosCliente.Datos.Id_Comprador) {
      console.error("No se pudo obtener el Id_Comprador del cliente.");
      return null;
    }

    const idComprador = datosCliente.Datos.Id_Comprador;
    const idBuyer = order.buyer.id || null;

    if (idBuyer && idBuyer === idComprador) {
      // Si los IDs coinciden, unir datos sin mostrar los IDs
      const { Id_Comprador, ...datosSinID } = datosCliente.Datos;

      return {
        ...datosSinID, // Agrega los datos del cliente sin el ID
        N_orden: await getNumber(),
        Producto: order.order_items?.[0]?.item?.title || "Sin Producto",
        Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
        Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
        tipo_pago: order.payments?.[0]?.payment_type || "No Especificado",
        fecha: new Date(order.date_created).toLocaleDateString('es-ES').split('/').reverse().join('') || "No Especificada",
        hora: new Date(order.date_created).toLocaleTimeString() || "No Especificada",
        sku: order.order_items?.[0]?.item?.seller_sku || "No Especificado",
    
      };
    } else {
      return null; // No coinciden, no se une la información
    }
  } catch (error) {
    console.error("Error comparando y uniendo datos:", error.message);
    return null;
  }
}

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

    const pedidos = await Promise.all(data.results
      .filter((pedido) => pedido.status === "paid")
      .map(async (order) => await compararYUnirDatos(order))
    );

    return pedidos.filter((pedido) => pedido !== null); // Filtra solo los que coinciden
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

async function compararYObtenerDatos(order) {
  try {
    const datosCliente = await obtenerDatos();

    if (!datosCliente || !datosCliente.Datos || !datosCliente.Datos.Id_Comprador) {
      console.error("No se pudo obtener el Id_Comprador del cliente.");
      return null;
    }

    const idComprador = datosCliente.Datos.Id_Comprador;
    const idBuyer = order.buyer.id || null;

    if (idBuyer && idBuyer === idComprador) {
      console.log("Los IDs coinciden, los datos se han juntado.");
      return datosCliente.Datos; // Devuelve los datos sin modificar
    }
    
    return null; // No coinciden, retorna null
  } catch (error) {
    console.error("Error obteniendo datos:", error.message);
    return null;
  }
}

function generarLineaDatos(datosCliente, order) {
  if (!datosCliente || !order) {
    console.error("Datos insuficientes para generar la línea.");
    return null;
  }
  
  return `numero_orders;${order.id};info_cust(${datosCliente.fecha || "nulo"}-${datosCliente.telefono || "nulo"}-${datosCliente.nombre || "nulo"}-${datosCliente.direccion || "nulo"}-${datosCliente.ciudad || "nulo"}-${datosCliente.telefono || "nulo"}-${datosCliente.telefono || "nulo"}-${datosCliente.giro || "nulo"});nulo;
number;cero;cero;number;info_cust(${datosCliente.tipo_usuario || "nulo"});once;info_cust(${datosCliente.tipo_usuario || "nulo"});blanco;blanco;uno;
nulo;nulo;cero;info_cust(${order.date_created ? new Date(order.date_created).toLocaleTimeString() : "nulo"});blanco;blanco;blaco;blanco;blanaco;blanco:blanco;info_cust(${datosCliente.correo || "nulo"});
nulo;info_cust(${order.date_created ? new Date(order.date_created).toLocaleDateString('es-ES').split('/').reverse().join('') : "nulo"});blanco;blanco;blanco;${order.order_items?.[0]?.quantity || "number2"};cerouno;uno;${order.order_items?.[0]?.item?.id || "number3"};cero;nulo;nulo;cero;cero;
nulo "|numero_orders;cerouno;${order.order_items?.[0]?.item?.seller_sku || "sku"};${order.seller_store || "sucursal"};dos;${order.order_items?.[0]?.quantity || "number2"};cero;${order.date_created ? new Date(order.date_created).toLocaleDateString('es-ES') : "fecha"};${order.date_created ? new Date(order.date_created).toLocaleTimeString() : "hora"};${order.order_items?.[0]?.unit_price || "precio"}|numero_orders;
cerodos;${order.order_items?.[1]?.item?.seller_sku || "sku"};${order.seller_store || "sucursal"};${order.order_items?.[1]?.quantity || "cantidad"};uno;cero;cero;${order.date_created ? new Date(order.date_created).toLocaleDateString('es-ES') : "fecha"};${order.date_created ? new Date(order.date_created).toLocaleTimeString() : "hora"};${order.order_items?.[1]?.unit_price || "precio"}`;
}


module.exports = { obtenerPedidos,generarDatos };
