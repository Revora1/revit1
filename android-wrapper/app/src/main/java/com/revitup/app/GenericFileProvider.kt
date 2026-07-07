package com.revitup.app

import androidx.core.content.FileProvider

/**
 * Custom FileProvider to avoid namespace collisions and safely generate
 * content:// URIs for image captures from the default device camera app.
 */
class GenericFileProvider : FileProvider()
