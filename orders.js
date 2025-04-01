const axios = require("axios");
const shell = require('shelljs');

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

// Función para obtener el número de orden ejecutando un script externo
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

// Función para obtener el token de acceso del vendedor
async function obtenerTokenVendedor() {
  // Implementa la lógica para obtener el token de acceso
  // ...
}

// Función para obtener los pedidos del vendedor
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

    const pedidos = await Promise.all(data.results.map(async (order) => ({
      N_orden: await getNumber(),
      Producto: order.order_items?.[0]?.item?.title || "Sin Producto",
      Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
      Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
      tipo_pago: order.payments?.[0]?.payment_type || "No Especificado",
      fecha: new Date(order.date_created).toLocaleDateString('es-ES').split('/').reverse().join('') || "No Especificada",
      hora: new Date(order.date_created).toLocaleTimeString() || "No Especificada",
      sku: order.order_items?.[0]?.item?.seller_sku || "No Especificado",
    })));

    return pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

// Función para crear la nota de venta
async function createOrder() {
  const pedidos = await obtenerPedidos();

  if (pedidos.length === 0) {
    console.log("No hay pedidos para procesar.");
    return false;
  }

  for (const pedido of pedidos) {
    const comandoCrear = `sh /data/create_customer.sh "${pedido.N_orden}|${pedido.Producto}|${pedido.Precio}|${pedido.Cantidad}|${pedido.tipo_pago}|${pedido.fecha}|${pedido.hora}|${pedido.sku}"`;

    // Mostrar el comando en la consola
    console.log("Comando a ejecutar:", comandoCrear);

    console.log("Verificando creación de la nota de venta...");

    let salidaCrear = shell.exec(comandoCrear, { silent: true });
    if (!salidaCrear || salidaCrear.code !== 0) {
      console.error('Error: Creación fallida.');
      console.error('Salida del script:', salidaCrear.stderr || salidaCrear.stdout);
      return false;
    }

    console.log(`Nota de venta para la orden ${pedido.N_orden} creada correctamente.`);
  }

  return true;
}

module.exports = { obtenerPedidos, createOrder,};