import Vue from 'vue'
import getBreadcrumbs from './../../helpers/getBreadcrumbs.js'
import getTarget from './../../helpers/getTarget.js'

/** Mutations for store_server_tree Vuex module. */
let server_tree_mutations = {}

    /**
     * Adds a new node to the server tree. Errors if `node_id` already exists.
     *
     * @param {object} state - current state in store
     * @param {object} payload - a new server tree node (must contain `node_id`)
     * @param {number} payload.node_id - a unique ID for the new node
     * @param {number} payload.parent - the ID of the new node’s parent node (null if at root)
     *
     * @see PATCH_NODE
     */
    server_tree_mutations.POST_NODE = function (state, payload) {
      // alias payload for more reasonable code
      let node = payload
      // make sure all conditions are met to add node to tree
      // Make sure node has a node_id property
      if (!node.hasOwnProperty('node_id')) {
        console.error('POST_NODE(): payload object must have node_id property.')
        return
      }
      // Make sure node has a parent property (even if it’s null)
      if (!node.hasOwnProperty('parent')) {
        console.error('POST_NODE(): payload object must have parent property.')
        return
      }
      // Make sure node’s node_id is new, i.e. not already present in nodes or orphans
      if (state.nodes.hasOwnProperty(node.node_id)
          || state.orphans.hasOwnProperty(node.node_id))
      {
        console.error('POST_NODE(): server_tree already contains a node with id of “' + node.node_id + '”. Use PATCH_NODE() instead.')
        return
      }
      // Make sure node’s parent is in the nodes list, otherwise it is an orphan
      // unless it’s parent is null, in which case it is a root node
      if (node.parent !== null
          && !state.nodes.hasOwnProperty(node.parent))
      {
        Vue.set(state.orphans, node.node_id, node)
        return
      }

      // Build up a “breadcrumbs” array for tracing a node’s position in the tree
      let breadcrumbs = getBreadcrumbs(node, state.nodes)
      // attach “breadcrumbs” array to the node for later reference
      Vue.set(node, 'breadcrumbs', breadcrumbs)

      // Trace breadcrumbs up tree to find place to attach new node
      let target = getTarget(state.tree, breadcrumbs)

      if (!target.child_nodes) {
        Vue.set(target, 'child_nodes', {})
      }
      // attach to tree and add node to nodes
      Vue.set(target.child_nodes, node.node_id, node)
      Vue.set(state.nodes, node.node_id, node)

      // run through orphans to pick up any that have this node as parent
      for (var orphan in state.orphans) {
        if (state.orphans.hasOwnProperty(orphan)) {
          if (state.orphans[orphan].hasOwnProperty('parent')
              && state.orphans[orphan].parent === node.node_id)
          {
            // if orphan has the new node as a parent,
            // add it to the tree and move it from orphans to nodes
            let orphanNode = state.orphans[orphan]
            let orphanBreadcrumbs = getBreadcrumbs(orphanNode, state.nodes)
            Vue.set(orphanNode, 'breadcrumbs', orphanBreadcrumbs)
            let orphanTarget = target.child_nodes[node.node_id]
            if (!orphanTarget.child_nodes) {
              Vue.set(orphanTarget, 'child_nodes', {})
            }
            // attach to tree, add to nodes, remove from orphans
            Vue.set(orphanTarget.child_nodes, orphanNode.node_id, orphanNode)
            Vue.set(state.nodes, orphanNode.node_id, orphanNode)
            Vue.delete(state.orphans, orphanNode.node_id)
          }
        }
      }
    }

    /**
     * Updates an existing node in the server tree. Errors if `node_id` doesn’t exist.
     * Updated properties must match in type. Adding properties to nodes is permitted.
     *
     * @param {object} state - current state in store
     * @param {object} payload - server tree node to update (must contain `node_id`)
     *
     * @see POST_NODE
     */
    server_tree_mutations.PATCH_NODE = function (state, payload) {
      if (!payload.hasOwnProperty('node_id')) {
        console.error('PATCH_NODE(): payload object must have node_id property.')
        return
      }
      if (!state.nodes.hasOwnProperty(payload.node_id)) {
        console.error('PATCH_NODE(): server_tree does not contain a node with id of “' + payload.node_id + '”. Use POST_NODE() instead.')
        return
      }
      for (var property in payload) {
        if (payload.hasOwnProperty(property)) {
          if (state.nodes[payload.node_id].hasOwnProperty(property)
              && typeof state.nodes[payload.node_id][property] !== typeof payload[property])
          {
            console.error('PATCH_NODE(): “' + state.nodes[payload.node_id][property] + '” and “' + payload[property] + '” are of different types.')
          } else {
            Vue.set(state.nodes[payload.node_id], property, payload[property])
          }
        }
      }
    }

    /**
     * Set the controls values for a node in the server tree.
     *
     * @param {object} state - current state in store
     * @param {object} payload - object representing updates to apply
     * @param {object} payload.node_id - ID of node to update
     * @param {object} payload.controls - object containing key-value pairs of controls to update
     */
    server_tree_mutations.PATCH_NODE_CONTROLS = function (state, payload) {
      if (!payload.hasOwnProperty('node_id')) {
        console.error('PATCH_NODE_CONTROLS(): payload object must have node_id property.')
        return
      }
      if (!state.nodes.hasOwnProperty(payload.node_id)) {
        console.error('PATCH_NODE_CONTROLS(): server_tree does not contain a node with id of “' + payload.node_id + '”.')
        return
      }
      if (!payload.hasOwnProperty('controls')
          || typeof payload.controls !== 'object'
          || payload.controls === null)
      {
        console.error('PATCH_NODE_CONTROLS(): payload does not contain a valid “controls” object.')
        return
      }
      for (var control in payload.controls) {
        if (payload.controls.hasOwnProperty(control)) {
          Vue.set(state.nodes[payload.node_id].controls, control, payload.controls[control])
        }
      }
    }

    /**
     * Set whether a node is shown or hidden in the server tree.
     *
     * @param {object} state - current state in store
     * @param {object} payload - object representing changes to apply
     * @param {number} payload.node_id - ID of node to show/hide
     * @param {boolean} [payload.show=true] - whether or not the node should be shown or not
     */
    server_tree_mutations.SHOW_NODE = function (state, payload) {
      if (!payload.hasOwnProperty('node_id')) {
        console.error('SHOW_NODE(): payload object must have node_id property.')
        return
      }
      if (!state.nodes.hasOwnProperty(payload.node_id)) {
        console.error('SHOW_NODE(): server_tree does not contain a node with id of “' + payload.node_id + '”.')
        return
      }
      let show = payload.hasOwnProperty('show') ? payload.show : true
      Vue.set(state.nodes[payload.node_id], 'showBody', show)
    }

    /**
     * Move a node from state.nodes to state.orphans, and remove it from state.tree.
     *
     * @param {object} state - current state in store
     * @param {object} payload
     * @param {number} payload.node_id - ID of node to move
     */
    server_tree_mutations.ORPHAN_NODE = function (state, payload) {
      if (!payload.hasOwnProperty('node_id')) {
        console.error('ORPHAN_NODE(): payload object must have node_id property.')
        return
      }
      if (!state.nodes.hasOwnProperty(payload.node_id)) {
        console.error('ORPHAN_NODE(): server_tree does not contain a node with id of “' + payload.node_id + '”.')
        return
      }
      let id = payload.node_id
      let node = state.nodes[id]
      // remove node from its location in state.tree
      let target = getTarget(state.tree, node.breadcrumbs)
      Vue.delete(target.child_nodes, id)
      // move node from state.nodes to state.orphans
      Vue.set(state.orphans, id, node)
      Vue.delete(state.nodes, id)
    }

    /**
     * Remove a node from state.orphans or from state.tree and state.nodes.
     *
     * @param {object} state - current state in store
     * @param {object} payload
     * @param {number} payload.node_id - ID of node to remove
     */
    server_tree_mutations.DELETE_NODE = function (state, payload) {
      if (!payload.hasOwnProperty('node_id')) {
        console.error('DELETE_NODE(): payload object must have node_id property.')
        return
      }
      if ( ! ( state.nodes.hasOwnProperty(payload.node_id)
               || state.orphans.hasOwnProperty(payload.node_id) ) )
      {
        console.error('DELETE_NODE(): server_tree does not contain a node with id of “' + payload.node_id + '”.')
        return
      }
      if (state.nodes.hasOwnProperty(payload.node_id)) {
        // delete the node from its location in state.tree
        let target = getTarget(state.tree, state.nodes[payload.node_id].breadcrumbs)
        Vue.delete(target.child_nodes, payload.node_id)
        // delete the node from state.nodes
        Vue.delete(state.nodes, payload.node_id)
      } else if (state.orphans.hasOwnProperty(payload.node_id)) {
        // delete the node from state.tree
        Vue.delete(state.orphans, payload.node_id)
      }
    }

export default server_tree_mutations
