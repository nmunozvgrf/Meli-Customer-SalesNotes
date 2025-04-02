const axios = require("axios");
const shell = require('shelljs');
const { obtenerTokenVendedor } = require("./token"); 
const { obtenerDatos } = require("./customer");

const URL = "https://api.mercadolibre.com/orders/search?seller=2257183696&status=paid";

const nulo = 'null';
const blanco = ' ';
const cero = '0';
const uno= '1';
const sucursal ='3';
const numeroE ='7555';
const numeroF ='1435';
const ceroUno ='01';
const numeroD='20241211';



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

    const pedidos = await Promise.all(data.results.map(async (order) => {
      const fechaObj = new Date(order.date_created);
      const Fecha = `${fechaObj.getDate().toString().padStart(2, '0')}${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}${fechaObj.getFullYear()}`;
      const Hora = `${fechaObj.getHours().toString().padStart(2, '0')}:${fechaObj.getMinutes().toString().padStart(2, '0')}`;
      
      return {
        N_orden: await getNumber(),
        Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
        Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
        Fecha,
        Hora,
        Sku: order.order_items?.[0]?.item?.seller_sku || "No Especificado",
        Pago: order.paid_amount || "0",
      };
    }));

    return pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

// Función para crear la nota de venta
async function createOrder() {
  const pedidos = await obtenerPedidos();
  const datosCombinados = await obtenerDatos(); // Asegúrate de obtener los datos

  if (!datosCombinados || !datosCombinados.Datos) {
    console.error("Error: No se pudieron obtener los datos combinados.");
    return false;
  }

  if (pedidos.length === 0) {
    console.log("No hay pedidos para procesar.");
    return false;
  }

  for (const pedido of pedidos) {
    const comandoCrear = `sh  /data/create_order.sh "${pedido.N_orden};${datosCombinados.Datos.Fecha_Creacion};${datosCombinados.Datos.Rut};${datosCombinados.Datos.Nombre};${datosCombinados.Datos.Direccion};${datosCombinados.Datos.Ciudad};
    ${datosCombinados.Datos.Telefono};${datosCombinados.Datos.Telefono};${datosCombinados.giro};${nulo};${pedido.Pago};${cero};${cero};${pedido.Pago};${uno};
    ${datosCombinados.tipo_Usuario};${once};${datosCombinados.tipo_Usuario};${blanco};${blanco};${uno};${nulo};${nulo};${cero};${blanco};${pedido.Hora};${blanco};
    ${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${datosCombinados.Datos.Email};${nulo};${numeroD};${blanco};${blanco};${blanco};${numeroE};${ceroUno};${uno};${numeroF};
    ${cero};${nulo};${nulo};${cero};${cero};${nulo}|${pedido.N_orden};${cero};${uno};${pedido.Sku};${sucursal};${pedido.Cantidad};${uno};${cero};${cero};${pedido.Fecha};${pedido.Hora};${pedido.Precio}"`;

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