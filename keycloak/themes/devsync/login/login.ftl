<#import "template.ftl" as layout>
<@layout.registrationLayout
    displayMessage=!messagesPerField.existsError('username','password')
    displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??;
    section>

  <#if section = "header">
    <div class="pm-brand">
      <div class="pm-logo">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2"  y="2"  width="7" height="10" rx="2" fill="white" opacity="0.95"/>
          <rect x="2"  y="14" width="7" height="6"  rx="2" fill="white" opacity="0.45"/>
          <rect x="11" y="2"  width="7" height="6"  rx="2" fill="white" opacity="0.45"/>
          <rect x="11" y="10" width="7" height="10" rx="2" fill="white" opacity="0.95"/>
          <rect x="20" y="2"  width="4" height="14" rx="2" fill="white" opacity="0.95"/>
          <rect x="20" y="18" width="4" height="6"  rx="2" fill="white" opacity="0.45"/>
        </svg>
      </div>
      <span class="pm-app-name">Project Management</span>
    </div>

  <#elseif section = "form">
    <#if realm.password>
      <form id="kc-form-login"
            onsubmit="login.disabled = true; return true;"
            action="${url.loginAction}"
            method="post">

        <#if !usernameHidden??>
          <div class="${properties.kcFormGroupClass!}">
            <label for="username" class="${properties.kcLabelClass!}">
              <#if !realm.loginWithEmailAllowed>
                ${msg("username")}
              <#elseif !realm.registrationEmailAsUsername>
                ${msg("usernameOrEmail")}
              <#else>
                ${msg("email")}
              </#if>
            </label>
            <input tabindex="1"
                   id="username"
                   class="${properties.kcInputClass!}"
                   name="username"
                   value="${(login.username!'')}"
                   type="text"
                   autofocus
                   autocomplete="username"
                   placeholder="<#if !realm.loginWithEmailAllowed>username<#elseif !realm.registrationEmailAsUsername>username or email<#else>you@company.com</#if>"
                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"/>
            <#if messagesPerField.existsError('username','password')>
              <span id="input-error" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
              </span>
            </#if>
          </div>
        </#if>

        <div class="${properties.kcFormGroupClass!}">
          <div class="pm-password-header">
            <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label>
            <#if realm.resetPasswordAllowed>
              <a tabindex="5" href="${url.loginResetCredentialsUrl}" class="pm-forgot">${msg("doForgotPassword")}</a>
            </#if>
          </div>
          <div class="${properties.kcInputGroup!}">
            <input tabindex="2"
                   id="password"
                   class="${properties.kcInputClass!}"
                   name="password"
                   type="password"
                   autocomplete="current-password"
                   placeholder="••••••••"
                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"/>
            <button class="${properties.kcFormPasswordVisibilityButtonClass!}"
                    type="button"
                    aria-label="${msg('showPassword')}"
                    aria-controls="password"
                    data-password-toggle
                    data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}"
                    data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}">
              <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <#if realm.rememberMe && !usernameHidden??>
          <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
            <div id="kc-form-options">
              <div class="checkbox">
                <label>
                  <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"
                         <#if login.rememberMe??>checked</#if>>
                  ${msg("rememberMe")}
                </label>
              </div>
            </div>
          </div>
        </#if>

        <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}">
          <input type="hidden" id="id-hidden-input" name="credentialId"
                 <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
          <input tabindex="4"
                 class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}"
                 name="login" id="kc-login" type="submit" value="${msg('doLogIn')}"/>
        </div>
      </form>
    </#if>

  <#elseif section = "info">
    <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
      <div id="kc-registration-container">
        <div id="kc-registration">
          <span>
            ${msg("noAccount")}
            <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a>
          </span>
        </div>
      </div>
    </#if>
  </#if>

</@layout.registrationLayout>
