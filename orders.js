const axios = require("axios");
const { obtenerTokenVendedor } = require("./token"); 
const {obtenerClientes, tipo_Usuario, giro, numero1, numero2, numero3, numero4} = require("./customer");
const shell = require('shelljs');

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";


async function obtenerDatosCliente() {
  const datos = await obtenerClientes();
  console.log(datos);
}

function getNumber() {
  try {
    // Ejecutar el script y capturar la salida
    const output = shell.exec(`sh /data/getnumber_order.sh`, { silent: true });

    // Verificar si el script se ejecutó correctamente
    if (output.code !== 0) {
      throw new Error(`Error ejecutando el script: ${output.stderr}`);
    }

    // Obtener y limpiar la salida
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

    const numberOrder = await getNumber();

    const Pedidos = data.results
      .filter((pedido) => pedido.status === "paid")
      .map(order => {
        const fechaHora = order.date_created ? new Date(order.date_created) : null;
        const fecha = fechaHora ? fechaHora.toLocaleDateString() : "No Especificada";
        const hora = fechaHora ? fechaHora.toLocaleTimeString() : "No Especificada";

        return {
          Numero_orden: numberOrder,
          Producto: order.order_items?.[0]?.item?.title || "Sin Producto",
          Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
          Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
          tipo_pago: order.payments?.[0]?.payment_type || "No Especificado",
          fecha: fecha,
          hora: hora,
        };
      });

    return Pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

obtenerDatosCliente();


module.exports = { obtenerPedidos };
