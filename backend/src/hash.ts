/*pour generer le hash du mot de passe ynjem ye3tek hashage mo5telef lnefes el kelma donc rakez la m7bech yemchi jerb2  :npx ts-node src/hash.ts wela node -e "const b = require('bcrypt'); b.hash('testpassword', 10).then(h => console.log(h));"*/
import * as bcrypt from 'bcrypt';

async function run() {
  const password = 'resppeda2026';
  const hash = await bcrypt.hash(password, 10);

  console.log(hash);
}

run();
/*el directeur :testpassword,admin:adminpass124,respopeda:resppeda2026  */