const { obtenerClientes,obtenerDatos } = require('./customer');
const { obtenerPedidos } = require('./orders');
const { obtenerTokenComprador, obtenerTokenVendedor } = require('./token');

async function ejecutar() {
  try {
    console.log("Obteniendo token del comprador...");
    const tokenComprador = await obtenerTokenComprador();
    console.log("Token Comprador obtenido:", tokenComprador);

    console.log("Obteniendo token del vendedor...");
    const tokenVendedor = await obtenerTokenVendedor();
    console.log("Token Vendedor obtenido:", tokenVendedor);

    console.log("Obteniendo pedidos...");
    const pedidos = await obtenerPedidos(tokenComprador); 
    console.log("Pedidos obtenidos:", pedidos);

   console.log("Obteniendo clientes...");
    await obtenerClientes(tokenVendedor); 
    await obtenerDatos();
  } catch (error) {
    console.error("Error en la ejecución:", error.message);
  }
}

ejecutar();
