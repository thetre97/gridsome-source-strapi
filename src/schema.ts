import consola from 'consola'

// Types
import { GridsomeStore, GridsomeStoreCollection, StrapiContentType } from './types'

const log = consola.withTag('gridsome-source-strapi')

const scalarTypeMap = new Map([
  ['integer', 'Int'],
    ['string', 'String'],
    ['text', 'String'],
    ['richtext', 'String'],
    ['uid', 'String'],
    ['timestamp', 'Date'],
    ['date', 'Date'],
    ['enumeration', 'String'],
    ['boolean', 'Boolean'],
    ['float', 'Float'],
    ['email', 'String'],
    ['password', 'String'],
    ['json', 'JSON']
])

interface Options {
  componentTypes: StrapiContentType[]
  contentTypes: StrapiContentType[]
  store: GridsomeStore
  imageCollection: GridsomeStoreCollection
  createTypeName: (value: string) => string
}

function createSchemaTypes ({ componentTypes, contentTypes, store, imageCollection, createTypeName }: Options): void {
  const createFieldTypes = (type: StrapiContentType) => Object.fromEntries(Object.entries(type.attributes).flatMap(([key, attributes]) => {
    if (key === 'id') return [[key, 'ID!']]
    if (attributes.type === 'media') return [[key, attributes.multiple ? `[${imageCollection.typeName}]` : imageCollection.typeName]]
    if (attributes.type === 'component') return [[key, attributes.repeatable ? `[${createTypeName(attributes.component)}]` : createTypeName(attributes.component)]]
    if (attributes.type === 'relation') return []
    if (attributes.type === 'dynamiczone') return []

    const scalarType = scalarTypeMap.get(attributes.type)
    if (!scalarType) {
      log.warn(`Could not find a matching GraphQL scalar type for ${type.apiID}.attributes.${key} (${attributes.type})`)
      return []
    }

    return [[key, scalarType]]
  }))

  // Create GraphQL types for each component type
  const componentSchemaTypes = componentTypes.map(type => {
    const schemaType = store.schema.createObjectType({
      name: createTypeName(type.uid),
      extensions: { infer: true },
      fields: createFieldTypes(type)
    })

    return schemaType
  })

  // Create GraphQL types for each content type
  const contentSchemaTypes = contentTypes.map(type => {
    const schemaType = store.schema.createObjectType({
      name: createTypeName(type.apiID),
      extensions: { infer: true },
      interfaces: ['Node'],
      fields: createFieldTypes(type)
    })

    return schemaType
  })

  // Add all to store
  store.addSchemaTypes([...componentSchemaTypes, ...contentSchemaTypes])
}

export default createSchemaTypes
