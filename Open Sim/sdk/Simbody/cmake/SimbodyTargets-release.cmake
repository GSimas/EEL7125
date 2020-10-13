#----------------------------------------------------------------
# Generated CMake target import file for configuration "Release".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "SimTKcommon" for configuration "Release"
set_property(TARGET SimTKcommon APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SimTKcommon PROPERTIES
  IMPORTED_IMPLIB_RELEASE "${_IMPORT_PREFIX}/lib/SimTKcommon.lib"
  IMPORTED_LINK_INTERFACE_LIBRARIES_RELEASE "lapack;blas"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/bin/SimTKcommon.dll"
  )

list(APPEND _IMPORT_CHECK_TARGETS SimTKcommon )
list(APPEND _IMPORT_CHECK_FILES_FOR_SimTKcommon "${_IMPORT_PREFIX}/lib/SimTKcommon.lib" "${_IMPORT_PREFIX}/bin/SimTKcommon.dll" )

# Import target "SimTKmath" for configuration "Release"
set_property(TARGET SimTKmath APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SimTKmath PROPERTIES
  IMPORTED_IMPLIB_RELEASE "${_IMPORT_PREFIX}/lib/SimTKmath.lib"
  IMPORTED_LINK_INTERFACE_LIBRARIES_RELEASE "SimTKcommon;lapack;blas"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/bin/SimTKmath.dll"
  )

list(APPEND _IMPORT_CHECK_TARGETS SimTKmath )
list(APPEND _IMPORT_CHECK_FILES_FOR_SimTKmath "${_IMPORT_PREFIX}/lib/SimTKmath.lib" "${_IMPORT_PREFIX}/bin/SimTKmath.dll" )

# Import target "SimTKsimbody" for configuration "Release"
set_property(TARGET SimTKsimbody APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SimTKsimbody PROPERTIES
  IMPORTED_IMPLIB_RELEASE "${_IMPORT_PREFIX}/lib/SimTKsimbody.lib"
  IMPORTED_LINK_INTERFACE_LIBRARIES_RELEASE "SimTKmath;SimTKcommon;lapack;blas"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/bin/SimTKsimbody.dll"
  )

list(APPEND _IMPORT_CHECK_TARGETS SimTKsimbody )
list(APPEND _IMPORT_CHECK_FILES_FOR_SimTKsimbody "${_IMPORT_PREFIX}/lib/SimTKsimbody.lib" "${_IMPORT_PREFIX}/bin/SimTKsimbody.dll" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
