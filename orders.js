const axios = require("axios");
const { obtenerTokenVendedor } = require("./token"); 
const { obtenerDatos } = require("./customer");
const shell = require('shelljs');

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

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

    // Obtener datos del comprador (cliente)
    const datosCliente = await obtenerDatos();

    // Obtener el Id_Comprador del cliente
    const idComprador = datosCliente ? datosCliente.Datos.Id_Comprador : null;
    if (!idComprador) {
      console.error("No se pudo obtener el Id_Comprador.");
      return [];
    }

    const Pedidos = await Promise.all(data.results
      .filter((pedido) => pedido.status === "paid")
      .map(async (order) => {
        const fechaHora = order.date_created ? new Date(order.date_created) : null;
        const fecha = fechaHora ? fechaHora.toLocaleDateString() : "No Especificada";
        const hora = fechaHora ? fechaHora.toLocaleTimeString() : "No Especificada";

        
        const salesNotes = order.buyer.id === idComprador ? "SalesNote relacionada con el comprador" : "Sin SalesNote asociada";
        
        const Orden= {
          Numero_orden: numberOrder,
          Producto: order.order_items?.[0]?.item?.title || "Sin Producto",
          Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
          Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
          tipo_pago: order.payments?.[0]?.payment_type || "No Especificado",
          fecha: fecha,
          hora: hora,
          Id_Buyer: order.buyer.id || "NO Encontrado",
          SalesNotes: salesNotes  
        };
        return Orden;
      })
    );

    return Pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

module.exports = { obtenerPedidos };
