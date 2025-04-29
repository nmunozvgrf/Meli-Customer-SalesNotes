const axios = require('axios');
const fs = require('fs');

const APP_ID = '7657258499288508';
const SECRET_KEY = 'pNcGkdqdSkv3gXiIRiYzdigAeS0BpSwM';
const REDIRECT_URI = 'https://dev-mercadolibre.vigfor.cl';

const AUTHORIZATION_CODE_1 = 'TG-67ddbe82489d5c000130a7d0-2256702090'; // Comprador
const AUTHORIZATION_CODE_2 = 'TG-6810e2de387b2d000120db6c-2415366090'; // Vendedor

const TOKEN_FILE = './tokens.json';

function loadTokens() {
    if (fs.existsSync(TOKEN_FILE)) {
        try {
            const fileContent = fs.readFileSync(TOKEN_FILE, 'utf-8');
            return fileContent ? JSON.parse(fileContent) : { comprador: {}, vendedor: {} };
        } catch (error) {
            console.error("Error leyendo tokens.json, archivo corrupto. Eliminando...");
            fs.unlinkSync(TOKEN_FILE); // Elimina el archivo corrupto
            return { comprador: {}, vendedor: {} };
        }
    }
    return { comprador: {}, vendedor: {} };
}

async function obtenerUserIdDesdeToken(accessToken) {
    try {
        const { data } = await axios.get('https://api.mercadolibre.com/users/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return data.id;
    } catch (error) {
        console.error("Error obteniendo user_id desde accessToken:", error.response?.data || error.message);
        return null;
    }
}

async function saveTokens(tokens, tipo) {
    if (!tokens.access_token || !tokens.refresh_token) {
        console.error(`${tipo} - Error: No se recibió un token válido para guardar.`);
        return;
    }

    let existingTokens = loadTokens();
    tokens.expires_at = Date.now() + tokens.expires_in * 1000;

  
    tokens.user_id = await obtenerUserIdDesdeToken(tokens.access_token);

    existingTokens[tipo.toLowerCase()] = tokens;

    fs.writeFileSync(TOKEN_FILE, JSON.stringify(existingTokens, null, 2));
    console.log(`${tipo} - Token guardado correctamente con user_id: ${tokens.user_id}`);
}

function isTokenExpired(tokens) {
    return !tokens.access_token || !tokens.expires_at || Date.now() >= tokens.expires_at;
}

async function obtenerToken(tipo) {
    let tokens = loadTokens()[tipo.toLowerCase()] || {};

    if (!isTokenExpired(tokens)) {
        console.log(`${tipo} - Usando token existente.`);
        return tokens.access_token;
    }

    if (tokens.refresh_token) {
        console.log(`${tipo} - Token expirado. Intentando refrescar...`);
        return await refrescarToken(tokens.refresh_token, tipo);
    }

    console.log(`${tipo} - No hay token válido. Solicitando uno nuevo...`);
    try {
        const response = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
            params: {
                grant_type: 'authorization_code',
                client_id: APP_ID,
                client_secret: SECRET_KEY,
                code: tipo === "Comprador" ? AUTHORIZATION_CODE_1 : AUTHORIZATION_CODE_2,
                redirect_uri: REDIRECT_URI,
            },
        });

        if (!response.data || !response.data.access_token) {
            throw new Error("La API no devolvió un token válido.");
        }

        tokens = response.data;
        await saveTokens(tokens, tipo);
        console.log(`${tipo} - Token obtenido correctamente.`);
        return tokens.access_token;
    } catch (error) {
        console.error(`${tipo} - Error obteniendo el token:`, error.response?.data || error.message);
    }
}

async function refrescarToken(refreshToken, tipo) {
    if (!refreshToken) {
        console.error(`${tipo} - No hay refresh_token válido. Se requiere obtener un nuevo token.`);
        return null;
    }

    try {
        console.log(`${tipo} - Intentando refrescar token...`);
        const response = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
            params: {
                grant_type: 'refresh_token',
                client_id: APP_ID,
                client_secret: SECRET_KEY,
                refresh_token: refreshToken,
            },
        });

        if (!response.data || !response.data.access_token) {
            throw new Error("No se pudo refrescar el token.");
        }

        const tokens = response.data;
        await saveTokens(tokens, tipo);
        console.log(`${tipo} - Nuevo token obtenido correctamente.`);
        return tokens.access_token;
    } catch (error) {
        console.error(`${tipo} - Error refrescando el token:`, error.response?.data || error.message);
        return null;
    }
}


function obtenerUserIdComprador() {
    const tokens = loadTokens();
    return tokens.comprador?.user_id || null;
}

module.exports = {
    obtenerTokenComprador: () => obtenerToken("Comprador"),
    obtenerTokenVendedor: () => obtenerToken("Vendedor"),
    obtenerUserIdComprador
};
