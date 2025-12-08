export const assetPath = (relativePath) => {
  const trimmedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  return `${import.meta.env.BASE_URL}${trimmedPath}`
}
