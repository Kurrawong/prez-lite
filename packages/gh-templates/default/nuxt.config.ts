

export default defineNuxtConfig({          
    compatibilityDate: '2025-07-15',
    extends: [
        ['github:hjohns/prez-lite/web', { auth: process.env.GITHUB_TOKEN, install: true }]
    ],
    css: ['~/assets/css/main.css'],

})
