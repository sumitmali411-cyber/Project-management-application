<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm'); section>

  <#if section = "header">
    ${msg("registerTitle")}

  <#elseif section = "form">
    <form id="kc-register-form" class="${properties.kcFormClass!}"
          action="${url.registrationAction}" method="post">

      <div class="${properties.kcFormGroupClass!}">
        <label class="${properties.kcLabelClass!}" for="firstName">
          ${msg("firstName")}
        </label>
        <input
          type="text"
          id="firstName"
          class="${properties.kcInputClass!}"
          name="firstName"
          value="${(register.formData.firstName!'')?html}"
          autocomplete="given-name"
          placeholder="John"
          aria-invalid="<#if messagesPerField.existsError('firstName')>true</#if>"
        />
        <#if messagesPerField.existsError('firstName')>
          <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
            ${kcSanitize(messagesPerField.get('firstName'))?no_esc}
          </span>
        </#if>
      </div>

      <div class="${properties.kcFormGroupClass!}">
        <label class="${properties.kcLabelClass!}" for="lastName">
          ${msg("lastName")}
        </label>
        <input
          type="text"
          id="lastName"
          class="${properties.kcInputClass!}"
          name="lastName"
          value="${(register.formData.lastName!'')?html}"
          autocomplete="family-name"
          placeholder="Doe"
          aria-invalid="<#if messagesPerField.existsError('lastName')>true</#if>"
        />
        <#if messagesPerField.existsError('lastName')>
          <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
            ${kcSanitize(messagesPerField.get('lastName'))?no_esc}
          </span>
        </#if>
      </div>

      <#if !realm.registrationEmailAsUsername>
        <div class="${properties.kcFormGroupClass!}">
          <label class="${properties.kcLabelClass!}" for="username">
            ${msg("username")}
          </label>
          <input
            type="text"
            id="username"
            class="${properties.kcInputClass!}"
            name="username"
            value="${(register.formData.username!'')?html}"
            autocomplete="username"
            placeholder="johndoe"
            aria-invalid="<#if messagesPerField.existsError('username')>true</#if>"
          />
          <#if messagesPerField.existsError('username')>
            <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
              ${kcSanitize(messagesPerField.get('username'))?no_esc}
            </span>
          </#if>
        </div>
      </#if>

      <div class="${properties.kcFormGroupClass!}">
        <label class="${properties.kcLabelClass!}" for="email">
          ${msg("email")}
        </label>
        <input
          type="email"
          id="email"
          class="${properties.kcInputClass!}"
          name="email"
          value="${(register.formData.email!'')?html}"
          autocomplete="email"
          placeholder="you@company.com"
          aria-invalid="<#if messagesPerField.existsError('email')>true</#if>"
        />
        <#if messagesPerField.existsError('email')>
          <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
            ${kcSanitize(messagesPerField.get('email'))?no_esc}
          </span>
        </#if>
      </div>

      <#if passwordRequired??>
        <div class="${properties.kcFormGroupClass!}">
          <label class="${properties.kcLabelClass!}" for="password">
            ${msg("password")}
          </label>
          <input
            type="password"
            id="password"
            class="${properties.kcInputClass!}"
            name="password"
            autocomplete="new-password"
            placeholder="Min 8 characters"
            aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
          />
          <#if messagesPerField.existsError('password')>
            <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
              ${kcSanitize(messagesPerField.get('password'))?no_esc}
            </span>
          </#if>
        </div>

        <div class="${properties.kcFormGroupClass!}">
          <label class="${properties.kcLabelClass!}" for="password-confirm">
            ${msg("passwordConfirm")}
          </label>
          <input
            type="password"
            id="password-confirm"
            class="${properties.kcInputClass!}"
            name="password-confirm"
            autocomplete="new-password"
            placeholder="Repeat password"
            aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
          />
          <#if messagesPerField.existsError('password-confirm')>
            <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
              ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
            </span>
          </#if>
        </div>
      </#if>

      <div class="${properties.kcFormGroupClass!}">
        <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
          <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}"
                 type="submit" value="${msg("doRegister")}"/>
        </div>
        <div style="text-align:center;margin-top:1rem;font-size:0.875rem;color:var(--muted)">
          ${msg("backToLogin")}
          <a href="${url.loginUrl}" style="font-weight:600;margin-left:4px">
            ${msg("doLogIn")}
          </a>
        </div>
      </div>

    </form>
  </#if>

</@layout.registrationLayout>
