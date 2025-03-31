const axios = require("axios");
const { obtenerTokenVendedor } = require("./token");
const { obtenerDatos } = require("./customer");
const shell = require('shelljs');

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

// Definición de variables constantes
const nulo = 'null';
const blanco = ' ';
const cero = '0';
const uno = '1';
const dos = '2';
const sucursal = '3';
const number = '8990';
const number2 = '7555';
const number3 = '1435';
const once = '11';
const cerouno = '01';
const cerodos = '02';

// Función para obtener el número de orden ejecutando un script externo
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

// Función para generar la línea de datos con información del cliente y productos
function generarDatos(datosCliente, order) {
  if (!datosCliente || !order) {
    console.error("Datos insuficientes para generar la línea.");
    return null;
  }

  // Obtener el número de orden desde getNumber()
  const N_orden = getNumber();
  if (!N_orden) {
    console.error("No se pudo obtener el número de orden.");
    return null;
  }

  // Formatear la fecha en formato día-mes-año sin separadores
  const fechaObj = new Date(order.date_created);
  const fecha = fechaObj.getDate().toString().padStart(2, '0') +
                (fechaObj.getMonth() + 1).toString().padStart(2, '0') +
                fechaObj.getFullYear().toString();

  // Formatear la hora en formato HH:MM:SS
  const hora = fechaObj.toTimeString().split(' ')[0];

  // Construir la primera parte de la línea con información del cliente
  const lineaCliente = `${N_orden};${fecha};${datosCliente.Telefono || nulo};${datosCliente.Nombre || nulo};${datosCliente.Ciudad || nulo};${datosCliente.Giro || nulo};${nulo};${number};${cero};${cero};${number};${datosCliente.Tipo_Usuario || nulo};${once};${datosCliente.Tipo_Usuario || nulo};${blanco};${blanco};${uno};${nulo};${nulo};${cero};${hora};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${datosCliente.Email || nulo};${nulo};${fecha};${blanco};${blanco};${blanco};${number2};${cerouno};${uno};${number3};${cero};${nulo};${nulo};${cero};${cero};${nulo}`;

  // Construir la parte repetitiva para cada producto en la orden
  const lineasProductos = order.order_items.map((item, index) => {
    const prefix = index === 0 ? '|' : '';
    return `${prefix}${N_orden};${cero};${uno};${item.item.seller_sku || "sku"};${order.seller_store || sucursal};${dos};${item.quantity || number2};${cero};${fecha};${hora};${item.unit_price || "precio"}`;
  }).join('\n');

  // Unir ambas partes y retornar la línea completa
  return `${lineaCliente}\n${lineasProductos}`;
}


module.exports = { obtenerPedidos, generarDatos };