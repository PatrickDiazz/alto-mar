/** URLs servidas pelo frontend em /public/assets — pack por tipo (PNG); ver PHOTO_CREDITS.txt. */
export function imagesForBoatType(tipo) {
  const b = "/assets";
  const interior = `${b}/boat-interior.jpg`;
  const bath = `${b}/boat-bathroom.jpg`;
  const ext = `${b}/boat-exterior.jpg`;
  switch (tipo) {
    case "Lancha":
      return [`${b}/lancha_exterior.png`, `${b}/lancha_interior_1.png`, `${b}/lancha_interior_2.png`];
    case "Veleiro":
      return [`${b}/veleiro_exterior.png`, `${b}/veleiro_interior_1.png`, `${b}/veleiro_interior_2.png`];
    case "Catamarã":
      return [`${b}/catamara_exterior.png`, `${b}/catamara_interior_1.png`, `${b}/catamara_interior_2.png`];
    case "Iate":
      return [`${b}/iate_exterior.png`, `${b}/iate_interior_1.png`, `${b}/iate_interior_2.png`];
    case "Escuna":
      return [`${b}/escuna_exterior.png`, `${b}/escuna_interior_1.png`, `${b}/escuna_interior_2.png`];
    case "Moto aquática":
      return [
        `${b}/moto_aquatica_exterior.png`,
        `${b}/moto_aquatica_interior_1.png`,
        `${b}/moto_aquatica_interior_2.png`,
      ];
    case "Saveiro":
      return [`${b}/saveiro_exterior.png`, `${b}/saveiro_interior_1.png`, `${b}/saveiro_interior_2.png`];
    case "Lancha inflável":
      return [
        `${b}/lancha_inflavel_exterior.png`,
        `${b}/lancha_inflavel_interior_1.png`,
        `${b}/lancha_inflavel_interior_2.png`,
      ];
    default:
      return [ext, interior, bath];
  }
}
