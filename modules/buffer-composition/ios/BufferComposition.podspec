Pod::Spec.new do |s|
  s.name           = 'BufferComposition'
  s.version        = '1.0.0'
  s.summary        = 'Whether the iOS IME has marked text in the buffer editor'
  s.description    = 'Reports UITextInput.markedTextRange of the buffer editor to JS and can end the composition.'
  s.author         = 'Intrinsic Labs'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
