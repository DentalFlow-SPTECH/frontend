import { toEquipmentPayload, toMovementPayload, toProductPayload } from '../model/inventory_model.js';

// Estoque e equipamentos (somente DENTISTA). A clínica é definida pela autenticação.
export function createInventoryRepository({ api }) {
    return {
        products: active => api.product.list({ active: active ? true : undefined }),
        product: id => api.product.get(id),
        movements: id => api.product.movements(id),
        saveProduct: (id, form) => (id ? api.product.update(id, toProductPayload(form)) : api.product.create(toProductPayload(form))),
        move: (id, form) => api.product.move(id, toMovementPayload(form)),
        equipment: active => api.equipment.list({ active: active ? true : undefined }),
        equipmentItem: id => api.equipment.get(id),
        saveEquipment: (id, form) => (id ? api.equipment.update(id, toEquipmentPayload(form)) : api.equipment.create(toEquipmentPayload(form))),
    };
}
