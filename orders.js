const axios = require("axios");
const shell = require('shelljs');
const fs = require("fs");
const path = require("path");
const { obtenerTokenVendedor } = require("./token"); 
const { obtenerDatos } = require("./customer");
const { Sendmail } = require("./email");
const mailer = new Sendmail();

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

      const buyerID = order.buyer.id || 'Sin Id Comprador';

      return {
        N_orden: await getNumber(),
        Precio: order.order_items?.[0]?.unit_price || "Sin Precio",
        Cantidad: order.order_items?.[0]?.quantity || "Sin Cantidad",
        Fecha,
        Hora,
        Sku: changeText(order.order_items?.[0]?.item?.seller_sku || "No Especificado"),
        Pago: order.paid_amount || "0",
        BuyerID: buyerID,  
      };
    }));

    return pedidos;
  } catch (error) {
    console.error("Error obteniendo las órdenes:", error.response?.data || error.message);
    return [];
  }
}

async function enviarCorreoAlerta(buyerID) {
  const asunto = "⚠️ Alerta: Buyer ID no coincide";
  const mensajeTexto = `Se detectó un BuyerID no coincidente: ${buyerID}`;
  const mensajeHTML = `<p><strong>Alerta:</strong> Se detectó un BuyerID no coincidente.</p><p>BuyerID: <b>${buyerID}</b></p>`;
  const destinatario = process.env.ALERTA_EMAIL || "nmunoz@vigfor.cl";

  await mailer. send365Email(destinatario, asunto, mensajeHTML, mensajeTexto);
}

async function createOrder() {
  const pedidos = await obtenerPedidos();
  const datosCombinados = await obtenerDatos();

  if (!datosCombinados || !datosCombinados.Datos) {
    console.error("No se pudieron obtener los datos combinados.");
    return false;
  }

  if (pedidos.length === 0) {
    console.log("No hay pedidos para procesar.");
    return false;
  }

  // Usamos Promise.all con map para que puedas usar async/await dentro del filtro
  const pedidosCoincidentes = (
    await Promise.all(pedidos.map(async (pedido) => {
      const buyerIDPedido = String(pedido.BuyerID).trim();
      const idCompradorDatos = String(datosCombinados.Datos.Id_Comprador).trim();

      if (buyerIDPedido !== idCompradorDatos) {
        await enviarCorreoAlerta(buyerIDPedido); // ✅ Se usa await aquí
        return null; // Excluir este pedido
      }

      return pedido; // Incluir este pedido
    }))
  ).filter(p => p !== null); // Limpiamos los que no coinciden

  if (pedidosCoincidentes.length === 0) {
    console.log(" Ningún pedido coincide con el ID de comprador.");
    return false;
  }

  for (const pedido of pedidosCoincidentes) {
    const numeroOrden = await getNumber();
    if (!numeroOrden) {
      console.error(`No se pudo obtener el número de orden para BuyerID: ${pedido.BuyerID}`);
      continue;
    }

    const comandoCrear = `sh /data/create_order.sh "${numeroOrden};${datosCombinados.Datos.fecha_Creacion};${datosCombinados.Datos.Rut};${datosCombinados.Datos.Nombre};${datosCombinados.Datos.Direccion};${datosCombinados.Datos.Ciudad};${datosCombinados.Datos.Telefono};${datosCombinados.Datos.Telefono};${datosCombinados.giro};${nulo};${pedido.Pago};${cero};${cero};${pedido.Pago};${uno};${datosCombinados.tipo_Usuario};${once};${datosCombinados.tipo_Usuario};${blanco};${blanco};${once};${nuloCero};${blanco};${datosCombinados.Datos.hora};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${blanco};${datosCombinados.Datos.Email};${nulo};${numeroD};${blanco};${blanco};${numeroE};${ceroUno};${uno};${numeroF};${cero};${nullZero}|${numeroOrden};${ceroUno};${pedido.Sku};${sucursal};${pedido.Cantidad};${numeroE};${cero};${pedido.Fecha};${pedido.Hora};${pedido.Precio}"`;

    console.log("🛠 Ejecutando comando:", comandoCrear);

    let salidaCrear = shell.exec(comandoCrear, { silent: true });
    if (!salidaCrear || salidaCrear.code !== 0) {
      console.error("Error al crear la orden.");
      console.error(" Salida:", salidaCrear.stderr || salidaCrear.stdout);
      continue;
    }

    console.log(`Nota de venta para la orden ${numeroOrden} creada exitosamente.`);
  }

  return true;
}

module.exports = { obtenerPedidos, createOrder };
